import { useParams } from 'react-router-dom';

const PaperViewPage = () => {
  const { paperId } = useParams();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-3xl font-bold">Paper++ Viewer</h1>
        <p className="text-muted-foreground">Viewing paper: {paperId}</p>
      </div>
    </div>
  );
};

export default PaperViewPage;
