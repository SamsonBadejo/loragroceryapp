export function createOrderNumber() {
  const date = new Date();

  const ymd = date
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");

  const random = Math.floor(1000 + Math.random() * 9000);

  return `LORA-${ymd}-${random}`;
}