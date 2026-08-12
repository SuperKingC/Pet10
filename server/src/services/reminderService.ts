import { parseReminderRequest } from '../domain/reminderRules.js'
import type { PetTask } from '../domain/models.js'
import type { RepositoryBundle } from '../repositories/contracts.js'

interface ReminderServiceDependencies {
  repositories: RepositoryBundle
  emit: (roomId: string, event: string, payload: unknown) => void
  emitUser: (userId: string, event: string, payload: unknown) => void
  notifyPush: (userId: string) => void | Promise<void>
  now?: () => Date
  logError?: (message: string, error: unknown) => void
}

function formatShanghai(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

function nextRun(task: PetTask) {
  const interval = task.scheduleType === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
  return new Date(task.nextRunAt.getTime() + interval)
}

export function createReminderService({
  repositories,
  emit,
  emitUser,
  notifyPush,
  now = () => new Date(),
  logError = (message, error) => console.error(message, error)
}: ReminderServiceDependencies) {
  async function sendPetMessage(roomId: string, text: string) {
    const message = await repositories.messages.create({
      roomId,
      senderType: 'pet',
      kind: 'pet',
      text
    })
    emit(roomId, 'message.created', message)
    return message
  }

  return {
    async handleMessage(roomId: string, userId: string, text: string) {
      if (!text.includes('提醒我')) return false
      const parsed = parseReminderRequest(text, now())
      if (!parsed) {
        await sendPetMessage(roomId, '汪，请告诉我具体时间，比如“30分钟后提醒我关火”或“明天早上8点提醒我带伞”。')
        return true
      }
      await repositories.tasks.create({
        roomId,
        userId,
        content: parsed.content,
        scheduleType: parsed.scheduleType,
        nextRunAt: parsed.nextRunAt
      })
      await sendPetMessage(roomId, `汪，提醒已设置：${formatShanghai(parsed.nextRunAt)}提醒你${parsed.content}。`)
      return true
    },

    async runDue(currentTime = now()) {
      const tasks = await repositories.tasks.claimDue(currentTime, 50)
      for (const task of tasks) {
        try {
          const message = await sendPetMessage(task.roomId, `汪，到时间啦：${task.content}`)
          const notification = await repositories.notifications.create(task.userId, 'pet_reminder', {
            roomId: task.roomId,
            taskId: task.id,
            messageId: message.id,
            content: task.content
          })
          emitUser(task.userId, 'notification.new', notification)
          await notifyPush(task.userId)
          if (task.scheduleType === 'once') {
            await repositories.tasks.complete(task.id)
          } else {
            await repositories.tasks.reschedule(task.id, nextRun(task))
          }
        } catch (error) {
          await repositories.tasks.fail(task.id)
          logError('reminder delivery failed', error)
        }
      }
    },

    start(intervalMs = 60_000) {
      const timer = setInterval(() => {
        void this.runDue()
      }, intervalMs)
      timer.unref?.()
      return () => clearInterval(timer)
    }
  }
}
