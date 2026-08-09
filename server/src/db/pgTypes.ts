interface PgTypes {
  setTypeParser(oid: number, parser: (value: string) => string): void
}

export function configurePostgresTypes(types: PgTypes): void {
  types.setTypeParser(1082, (value) => value)
}
