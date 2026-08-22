import { apiRequest } from './apiClient'

export interface AccountDeactivateResult {
  deactivated: boolean
}

export const accountApi = {
  deactivate() {
    return apiRequest<AccountDeactivateResult>('/api/account/deactivate', {
      method: 'POST',
      body: {}
    })
  }
}
