import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0b0d",
        }}
      >
        <span style={{ color: "#22d3ee", fontSize: 108, fontWeight: 700, fontFamily: "monospace" }}>G</span>
      </div>
    ),
    { ...size },
  );
}
