export function parseReviewInput(input: { rating: unknown; body: unknown }) {
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw Object.assign(new Error("Choose a rating from 1 to 5 stars"), { status: 400 });
  }
  const body = String(input.body ?? "").trim();
  if (body.length < 10) {
    throw Object.assign(new Error("Write at least 10 characters so others know what to expect"), { status: 400 });
  }
  if (body.length > 2000) {
    throw Object.assign(new Error("Keep your review under 2,000 characters"), { status: 400 });
  }
  return { rating, body };
}
