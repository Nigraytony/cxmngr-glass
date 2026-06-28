import { defineStore } from 'pinia'
import { actionsRepository } from '../data/actionsRepository'

// Actions = sub-records of work under an Activity (see backend models/action.js).
export const useActionsStore = defineStore('actions', () => {
  async function list(activityId: string, projectId?: string) {
    return actionsRepository.list(activityId, projectId)
  }

  async function create(payload: Record<string, any>) {
    return actionsRepository.create(payload)
  }

  async function update(id: string, payload: Record<string, any>) {
    return actionsRepository.update(id, payload)
  }

  async function remove(id: string) {
    await actionsRepository.remove(id)
  }

  return { list, create, update, remove }
})
