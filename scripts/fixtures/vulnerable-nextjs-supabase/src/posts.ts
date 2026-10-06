export const getPost = (slug: string) =>
  supabase.from("posts").select("*").eq("slug", slug);
