import { z } from 'zod'

export const FileKindEnum = z.enum(['pdf', 'image'])
export type FileKind = z.infer<typeof FileKindEnum>

export const FileMetaSchema = z.object({
  First: z.string().default(''),
  Last: z.string().default(''),
  DocType: z.string().default(''),
  Side: z.string().default(''),
  DateISO: z.string().default(''),
})
export type FileMeta = z.infer<typeof FileMetaSchema>

export const FileItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: FileKindEnum,
  originalBytes: z.number().nonnegative(),
  estBytes: z.number().nonnegative().nullable(),
  status: z.enum(['queued', 'ready', 'error']).default('queued'),
  meta: FileMetaSchema,
})
export type FileItem = z.infer<typeof FileItemSchema> & { file: File; finalBytes?: number; serverRecommended?: boolean; note?: string }

export const TemplateSchema = z.object({
  value: z.string(),
})
export type Template = z.infer<typeof TemplateSchema>

export const SettingsSchema = z.object({
  template: z.string().default('{{Last}}_{{First}}_{{DocType}}_{{Side}}_{{DateISO}}.pdf'),
})
export type Settings = z.infer<typeof SettingsSchema>
