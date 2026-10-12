import { describe, expect, it } from "vitest"
import { appearanceFromStats, buildChecks, rejectReason, sniffImageType } from "./files"

describe("file checks", () => {
  it("recognises PNG and JPEG signatures", () => {
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe("png")
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0]))).toBe("jpeg")
    expect(sniffImageType(new Uint8Array([0x49, 0x49, 0x2a, 0]))).toBeNull()
  })

  it("rejects TIFF by name and damaged contents", () => {
    expect(rejectReason(file("slide.tiff", 100), new Uint8Array([0x49, 0x49]))).toMatch(/TIFF/)
    expect(rejectReason(file("field.png", 100), new Uint8Array([1, 2, 3, 4]))).toMatch(/not a PNG/)
  })

  it("warns on a bright colored field and fails an oversized image", () => {
    const warned = buildChecks({ bytes: 1000, width: 200, height: 200, appearance: "warn" })
    expect(warned.ok).toBe(true)
    expect(warned.needsAcknowledgement).toBe(true)
    const failed = buildChecks({ bytes: 1000, width: 8000, height: 100, appearance: "pass" })
    expect(failed.ok).toBe(false)
    expect(appearanceFromStats({ median: 180, meanSaturation: 0.4 })).toBe("warn")
    expect(appearanceFromStats({ median: 12, meanSaturation: 0.02 })).toBe("pass")
  })
})

function file(name: string, size: number): File {
  const blob = new File([new Uint8Array(size)], name)
  return blob
}
