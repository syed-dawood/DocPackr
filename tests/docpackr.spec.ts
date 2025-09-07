import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'
import AdmZip from 'adm-zip'
import { PDFDocument } from 'pdf-lib'

async function makeJpegBuffer(page, text?: string): Promise<Buffer> {
  const base64 = await page.evaluate(async (t) => {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 80
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#000000'
    ctx.font = '20px Arial'
    if (t) ctx.fillText(t, 10, 40)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    return dataUrl.split(',')[1]
  }, text || null)
  return Buffer.from(base64, 'base64')
}

async function makePdfBuffer(): Promise<Buffer> {
  const pdf = await PDFDocument.create()
  pdf.addPage([200, 100])
  const bytes = await pdf.save({ useObjectStreams: true })
  return Buffer.from(bytes)
}

test.describe('DocPackr happy path', () => {
  test('pack 2 jpg + 1 pdf with simple template', async ({ page }) => {
    await page.goto('/')

    // Use simple template with index to avoid relying on metadata
    await page.getByLabel('Rename template').fill('{{Index1}}.pdf')

    // Prepare three files
    const jpg1 = await makeJpegBuffer(page)
    const jpg2 = await makeJpegBuffer(page)
    const pdf = await makePdfBuffer()

    const input = page.locator('input[type="file"]')
    await input.setInputFiles([
      { name: 'first.jpg', mimeType: 'image/jpeg', buffer: jpg1 },
      { name: 'second.jpg', mimeType: 'image/jpeg', buffer: jpg2 },
      { name: 'doc.pdf', mimeType: 'application/pdf', buffer: pdf },
    ])

    // Compress & Zip
    await page.getByRole('button', { name: 'Compress & Zip' }).click()

    // Wait for download to be enabled then download
    const downloadBtn = page.getByRole('button', { name: 'Download ZIP' })
    await expect(downloadBtn).toBeEnabled()
    const [download] = await Promise.all([page.waitForEvent('download'), downloadBtn.click()])

    const zipPath = await download.path()
    expect(zipPath).toBeTruthy()
    const zipData = readFileSync(zipPath!)
    const zip = new AdmZip(zipData)
    const entries = zip.getEntries().map((e) => e.entryName)
    expect(entries).toContain('manifest.txt')
    expect(entries).toContain('1.pdf')
    expect(entries).toContain('2.pdf')
    expect(entries).toContain('3.pdf')
  })
})

test.describe('DocPackr OCR hints', () => {
  test('enabling OCR suggests DocType=Passport', async ({ page }) => {
    await page.goto('/')

    // Enable OCR
    await page.getByLabel('Smart hints (OCR)').check()
    // Template based on DocType
    await page.getByLabel('Rename template').fill('{{DocType}}.pdf')

    // Create an image with the word Passport
    const jpg = await makeJpegBuffer(page, 'Passport')
    const input = page.locator('input[type="file"]')
    await input.setInputFiles([{ name: 'IMG_1234.JPG', mimeType: 'image/jpeg', buffer: jpg }])

    // Select the row to drive preview context
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Passport.pdf')).toBeVisible()

    // Pack and verify name is used
    await page.getByRole('button', { name: 'Compress & Zip' }).click()
    const downloadBtn = page.getByRole('button', { name: 'Download ZIP' })
    await expect(downloadBtn).toBeEnabled()
    const [download] = await Promise.all([page.waitForEvent('download'), downloadBtn.click()])
    const zipPath = await download.path()
    const zipData = readFileSync(zipPath!)
    const zip = new AdmZip(zipData)
    const entries = zip.getEntries().map((e) => e.entryName)
    expect(entries).toContain('Passport.pdf')
  })
})
