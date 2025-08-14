import { useState, useEffect } from 'react';
import { Plus, MoreVertical, Lock, Trash2, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCollections, Collection } from '@/hooks/useCollections';
import { CollectionModal } from './CollectionModal';
import { Video } from '@/hooks/usePaginatedVideos';
import { useAuth } from '@/hooks/useAuth';

interface CollectionGridProps {
  userId?: string;
  onCollectionSelect?: (collection: Collection) => void;
}

export const CollectionGrid = ({ userId, onCollectionSelect }: CollectionGridProps) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | undefined>();
  const [deletingCollection, setDeletingCollection] = useState<Collection | undefined>();
  const [collectionVideos, setCollectionVideos] = useState<Record<string, Video[]>>({});
  
  const { getUserCollections, deleteCollection, getCollectionVideos } = useCollections();
  const { user } = useAuth();

  const isOwnProfile = !userId || user?.id === userId;

  useEffect(() => {
    loadCollections();
  }, [userId]);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const data = await getUserCollections(userId);
      setCollections(data);

      // Load preview videos for each collection
      const videoPromises = data.map(async (collection) => {
        const videos = await getCollectionVideos(collection.id);
        return { collectionId: collection.id, videos: videos.slice(0, 4) };
      });

      const results = await Promise.all(videoPromises);
      const videosMap = results.reduce((acc, { collectionId, videos }) => {
        acc[collectionId] = videos;
        return acc;
      }, {} as Record<string, Video[]>);

      setCollectionVideos(videosMap);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCollection) return;
    
    const success = await deleteCollection(deletingCollection.id);
    if (success) {
      setCollections(prev => prev.filter(c => c.id !== deletingCollection.id));
    }
    setDeletingCollection(undefined);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {isOwnProfile && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="aspect-square bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 hover:bg-muted/70 transition-colors"
          >
            <Plus className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Create Collection</span>
          </button>
        )}
        
        {collections.map((collection) => {
          const videos = collectionVideos[collection.id] || [];
          return (
            <div key={collection.id} className="relative group">
              <button
                onClick={() => onCollectionSelect?.(collection)}
                className="w-full aspect-square bg-muted rounded-lg overflow-hidden relative"
              >
                {videos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-0.5 h-full">
                    {videos.slice(0, 4).map((video, idx) => (
                      <div key={idx} className="bg-muted">
                        <img
                          src={video.thumbnail_url || '/placeholder.svg'}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {videos.length < 4 && [...Array(4 - videos.length)].map((_, idx) => (
                      <div key={`empty-${idx}`} className="bg-muted/50" />
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Eye className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                )}
                
                {collection.is_private && (
                  <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                    <Lock className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
              
              <div className="mt-2 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{collection.name}</h3>
                  <p className="text-xs text-muted-foreground">{videos.length} videos</p>
                </div>
                
                {isOwnProfile && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingCollection(collection)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeletingCollection(collection)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {collections.length === 0 && !isOwnProfile && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No collections yet</p>
        </div>
      )}

      <CollectionModal
        open={showCreateModal || !!editingCollection}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setEditingCollection(undefined);
          }
        }}
        collection={editingCollection}
        onSuccess={loadCollections}
      />

      <AlertDialog open={!!deletingCollection} onOpenChange={(open) => !open && setDeletingCollection(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCollection?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};