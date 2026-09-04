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

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(145deg, #8064ef 0%, #4a31bb 100%)",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "rgba(255,255,255,.96)",
            borderRadius: "27%",
            boxShadow: "0 10px 35px rgba(38,20,105,.22)",
            color: "#4a31bb",
            display: "flex",
            fontFamily: "Arial, sans-serif",
            fontSize: requestedSize * 0.28,
            fontWeight: 800,
            height: "62%",
            justifyContent: "center",
            letterSpacing: "-0.08em",
            paddingRight: "0.06em",
            width: "62%",
          }}
        >
          LC
        </div>
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
