import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

interface RequestChapter {
  filename: string;
  content: string;
}

interface RequestImage {
  path: string;
  data: string;
}

interface RequestBody {
  book: {
    title: string;
    author: string;
    description?: string;
    subtitle?: string;
    bookDir: string;
    contextDir: string;
    imagesDir?: string;
    parts: {
      title: string;
      chapters: {
        id: string;
        file: string;
        label: string;
      }[];
    }[];
  };
  chapters: RequestChapter[];
  images?: RequestImage[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { book, chapters, images } = body;

    if (!book || !chapters || chapters.length === 0) {
      return NextResponse.json(
        { error: "Missing book or chapters data" },
        { status: 400 },
      );
    }

    const zip = new JSZip();

    zip.file("book.json", JSON.stringify(book, null, 2));

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      const paddedIndex = String(i + 1).padStart(2, "0");
      const filename = ch.filename || paddedIndex + "-chapter.md";
      zip.file(filename, ch.content);
    }

    if (images && images.length > 0) {
      const imgFolder = zip.folder("images");
      if (imgFolder) {
        for (const img of images) {
          const name = img.path.split("/").pop() || img.path;
          const binaryData = Buffer.from(img.data, "base64");
          imgFolder.file(name, binaryData);
        }
      }
    }

    const tocLines: string[] = ["# " + book.title, ""];
    if (book.author) {
      tocLines.push("**Author:** " + book.author);
      tocLines.push("");
    }
    if (book.description) {
      tocLines.push(book.description);
      tocLines.push("");
    }
    tocLines.push("## Table of Contents");
    tocLines.push("");

    for (const part of book.parts) {
      tocLines.push("### " + part.title);
      tocLines.push("");
      for (const ch of part.chapters) {
        const matchingFile = chapters.find(function findChapter(c) {
          return c.filename === ch.file || c.filename === ch.id + ".md";
        });
        const link = matchingFile ? matchingFile.filename : ch.file;
        tocLines.push("- [" + ch.label + "](./" + link + ")");
      }
      tocLines.push("");
    }

    tocLines.push("---");
    tocLines.push("");
    tocLines.push("*Exported from Scriva*");

    zip.file("README.md", tocLines.join("\n"));

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const safeName = book.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-");

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeName}-manuscript.zip"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
