import { defineField, defineType } from "sanity";

/** S3 prefix for one downloadable HOK file. */
function s3FolderField(folder) {
  return defineField({
    name: "s3Folder",
    title: "S3 folder",
    type: "string",
    options: {
      list: [{ title: folder, value: folder }],
      layout: "dropdown",
    },
    initialValue: folder,
    validation: (rule) => rule.required(),
  });
}

export const brochure = defineType({
  name: "brochure",
  title: "Brochure",
  type: "object",
  fields: [s3FolderField("documents/project brochure/")],
});

export const reraCertificate = defineType({
  name: "reraCertificate",
  title: "RERA certificate",
  type: "object",
  fields: [s3FolderField("documents/rera certificate/")],
});

export const architecturalPlan = defineType({
  name: "architecturalPlan",
  title: "Architectural plan",
  type: "object",
  fields: [s3FolderField("documents/architectural plan/")],
});

/** Brochure, RERA certificate, and architectural plan, each from its own S3 folder. */
export const hokDownloads = defineType({
  name: "hokDownloads",
  title: "HOK downloads",
  type: "document",
  fields: [
    defineField({
      name: "brochure",
      title: "Brochure",
      type: "brochure",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "reraCertificate",
      title: "RERA certificate",
      type: "reraCertificate",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "architecturalPlan",
      title: "Architectural plan",
      type: "architecturalPlan",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    prepare() {
      return { title: "HOK downloads" };
    },
  },
});
