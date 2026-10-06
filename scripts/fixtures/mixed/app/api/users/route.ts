export async function POST(request: Request) {
  const body = await request.json();
  eval(body.action);
  return Response.json(body);
}
