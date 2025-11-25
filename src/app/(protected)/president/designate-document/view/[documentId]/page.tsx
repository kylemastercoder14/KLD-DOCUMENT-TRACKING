import { notFound } from "next/navigation";
import { getDocumentById } from "@/actions/document";
import { getCurrentUser } from "@/actions/user";
import { DocumentViewer } from "./document-viewer";

interface PageProps {
  params: Promise<{
    documentId: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const { documentId } = await params;

  const [document, currentUser] = await Promise.all([
    getDocumentById(documentId),
    getCurrentUser(),
  ]);

  if (!document) {
    notFound();
  }

  return (
    <DocumentViewer
      document={document}
      currentUser={currentUser}
    />
  );
};

export default Page;

