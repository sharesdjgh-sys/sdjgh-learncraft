/* eslint-disable @next/next/no-img-element */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

const supportedSizes = new Set([180, 192, 512]);

export function generateStaticParams() {
  return [...supportedSizes].map((size) => ({ size: String(size) }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const requestedSize = Number((await params).size);
  if (!supportedSizes.has(requestedSize)) {
    return new Response("Not found", { status: 404 });
  }
  const favicon = await readFile(path.join(process.cwd(), "ref", "logo-concepts", "favicon.png"));
  const faviconSrc = `data:image/png;base64,${favicon.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(145deg, #f7f4ff 0%, #e8e0ff 100%)",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <img
          src={faviconSrc}
          alt=""
          style={{
            height: "82%",
            objectFit: "contain",
            width: "82%",
          }}
        />
      </div>
    ),
    {
      width: requestedSize,
      height: requestedSize,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
