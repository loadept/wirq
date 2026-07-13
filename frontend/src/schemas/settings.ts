import { z } from "zod"

const SettingsSchema = z.object({
  certPath: z.string().trim().min(1, "Cert path is required"),
  certKeyPath: z.string().trim().min(1, "Cert key path is required"),
  serverHost: z.string().trim().min(1, "Server host is required"),
  serverPort: z
    .number()
    .int()
    .min(1, "Invalid port")
    .max(65535, "Invalid port"),
  appearance: z.enum(["dark", "light"]).catch("dark"),
})

export { SettingsSchema }
