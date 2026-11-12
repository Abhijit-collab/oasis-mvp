import { defineField, defineType } from "sanity";

/** Allowed S3 prefixes for the HOK project gallery. */
export const S3_GALLERY_FOLDERS = [
  { title: "hok-gallery/", value: "hok-gallery/" },
  { title: "image/", value: "image/" },
];

/** Document that selects which S3 folder feeds the HOK gallery. */
export const hokGallery = defineType({
  name: "hokGallery",
  title: "HOK Gallery",
  type: "document",
  fields: [
    defineField({
      name: "s3Folder",
      title: "S3 gallery folder",
      type: "string",
      options: {
        list: S3_GALLERY_FOLDERS,
        layout: "dropdown",
      },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "s3Folder" },
    prepare({ title }) {
      return { title: title || "HOK Gallery" };
    },
  },
});
