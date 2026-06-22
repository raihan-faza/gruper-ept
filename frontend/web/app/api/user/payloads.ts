export interface CreateUserPayload {
  id: string
  username: string
  first_name: string
  last_name: string
  phone_number?: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface UpdateUserPayload {
  username?: string
  first_name?: string
  last_name?: string
  phone_number?: string
}

