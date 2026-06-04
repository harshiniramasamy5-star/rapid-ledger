export async function createLinearIssue({
  title,
  description,
  teamId,
  apiKey,
}: {
  title: string;
  description: string;
  teamId: string;
  apiKey: string;
}) {
  const mutation = `
    mutation CreateIssue($title: String!, $description: String!, $teamId: String!) {
      issueCreate(input: { title: $title, description: $description, teamId: $teamId }) {
        success
        issue { id title url identifier }
      }
    }
  `;
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": apiKey,
      "x-apollo-operation-name": "CreateIssue",
    },
    body: JSON.stringify({ query: mutation, variables: { title, description, teamId } }),
  });
  const data = await res.json() as { errors?: Array<{ message: string }>; data?: { issueCreate: { success: boolean; issue: { id: string; title: string; url: string; identifier: string } } } };
  if (data.errors) throw new Error(data.errors[0].message);
  if (!data.data) throw new Error("No data returned from Linear");
  return data.data.issueCreate;
}
