// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const apiGuides = defineCollection({
    // The glob loader automatically finds all markdown/mdx files in this folder
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/api-guides" }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        method: z.string().optional(), // Perfect for "POST /api/v1" badges
        pubDate: z.coerce.date(),
    })
});

// Expose the collection to Astro
export const collections = { 'api-guides': apiGuides };