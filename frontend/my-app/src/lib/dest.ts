export const DST_SELECTOR = BigInt(process.env.NEXT_PUBLIC_DST_SELECTOR || "0");

// Optional: put the *correct* selector mapping here when you have it.
const SELECTOR_TO_NAME: Record<string, string> = {
  // "16015286601757825753": "Polygon Amoy",
  // "3478487238524512106": "Arbitrum Sepolia",
};

export function getDestName() {
  return (
    process.env.NEXT_PUBLIC_DEST_NAME ||
    SELECTOR_TO_NAME[String(DST_SELECTOR)] ||
    "Destination"
  );
}
