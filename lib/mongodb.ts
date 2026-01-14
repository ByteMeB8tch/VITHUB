// lib/appwriteDb.ts - Appwrite database utilities
import { Client, Databases, ID } from 'appwrite'

let cachedDatabases: Databases | null = null

export function getAppwriteDatabases(): Databases {
  if (cachedDatabases) {
    return cachedDatabases
  }

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')

  cachedDatabases = new Databases(client)
  return cachedDatabases
}

export async function createDocument(
  collectionId: string,
  data: any,
  documentId?: string
) {
  const databases = getAppwriteDatabases()
  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'campushub'

  return databases.createDocument(
    dbId,
    collectionId,
    documentId || ID.unique(),
    data
  )
}

export async function getDocument(collectionId: string, documentId: string) {
  const databases = getAppwriteDatabases()
  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'campushub'

  return databases.getDocument(dbId, collectionId, documentId)
}

export async function updateDocument(
  collectionId: string,
  documentId: string,
  data: any
) {
  const databases = getAppwriteDatabases()
  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'campushub'

  return databases.updateDocument(dbId, collectionId, documentId, data)
}

export async function deleteDocument(collectionId: string, documentId: string) {
  const databases = getAppwriteDatabases()
  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'campushub'

  return databases.deleteDocument(dbId, collectionId, documentId)
}

export async function listDocuments(
  collectionId: string,
  queries?: string[]
) {
  const databases = getAppwriteDatabases()
  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'campushub'

  return databases.listDocuments(dbId, collectionId, queries)
}

export { ID }
