import { useParams } from 'react-router-dom';

const PublicProfilePage = () => {
  const { userId } = useParams();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-3xl font-bold">Researcher Profile</h1>
        <p className="text-muted-foreground">Profile: {userId}</p>
      </div>
    </div>
  );
};

export default PublicProfilePage;
