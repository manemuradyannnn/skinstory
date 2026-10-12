export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function demoPhotoSrc(seed: number): string {
  const index = (Math.abs(seed) % 3) + 1;
  return `/samples/demo-${index}.svg`;
}

export function readImageFile(file: File): Promise<{ src: string; name: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return Promise.reject(
      new Error("Please choose a JPG, PNG, GIF, or WebP image."),
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return Promise.reject(
      new Error("That image is larger than 8 MB. Please choose a smaller one."),
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve({ src: reader.result, name: file.name });
        return;
      }
      reject(new Error("That image could not be read. Please try a different file."));
    };
    reader.onerror = () => {
      reject(new Error("That image could not be read. Please try a different file."));
    };
    reader.readAsDataURL(file);
  });
}

export function photoKindLabel(kind: "sample" | "demo" | "upload"): string {
  if (kind === "sample") return "Sample illustration";
  if (kind === "demo") return "Demo illustration";
  return "Photo";
}
