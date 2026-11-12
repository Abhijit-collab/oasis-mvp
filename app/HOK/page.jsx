import { createClient } from "@sanity/client";
import { HOKExplorer } from "@/components/hok";
import { GALLERY_IMAGES } from "@/components/hok/assets";
import { getLiveUnits } from "@/lib/getLiveUnits";
import { getS3Gallery } from "@/lib/s3Gallery";

const GALLERY_FOLDERS = new Set(["hok-gallery/", "image/"]);

export const metadata = {
  title: "House of Krishna · Premium Experience",
  description: "Private 360 walkthrough for House of Krishna.",
};

async function loadGalleryImages() {
  try {
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
    if (!projectId) return GALLERY_IMAGES;

    const client = createClient({
      projectId,
      dataset,
      apiVersion: "2024-01-01",
      useCdn: true,
    });
    const s3Folder = await client.fetch('*[_type == "hokGallery"][0].s3Folder');
    if (typeof s3Folder !== "string" || !GALLERY_FOLDERS.has(s3Folder)) {
      return GALLERY_IMAGES;
    }

    const images = await getS3Gallery(s3Folder);
    return images.length > 0 ? images : GALLERY_IMAGES;
  } catch {
    return GALLERY_IMAGES;
  }
}

export default async function HOKPage() {
  const [liveUnits, galleryImages] = await Promise.all([getLiveUnits(), loadGalleryImages()]);
  return <HOKExplorer liveUnits={liveUnits} galleryImages={galleryImages} />;
}
