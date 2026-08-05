import { supabase } from './supabaseClient'
import { v4 as uuidv4 } from 'uuid'

export interface UploadResult {
  publicUrl: string
  fileName: string
  path: string
}

export const uploadAssetToSupabase = async (
  file: File,
  clientId: string
): Promise<UploadResult> => {
  const fileExt = file.name.split('.').pop()
  const uniqueName = `${uuidv4()}.${fileExt}`
  const filePath = `${clientId}/assets/${uniqueName}`

  const { data, error } = await supabase.storage
    .from('crewlab-assets')
    .upload(filePath, file)

  if (error) {
    throw error
  }

  const { data: publicUrlData } = supabase.storage
    .from('crewlab-assets')
    .getPublicUrl(filePath)

  return {
    publicUrl: publicUrlData.publicUrl,
    fileName: file.name,
    path: filePath,
  }
}
