import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { CreateSite } from './create-site';
import { ImportSite } from './import-site';
import { SiteList } from './site-list';

export const SiteManager = () => {
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Site Management</h1>

      <div className="flex gap-3">
        <Button
          variant={!showImport ? 'default' : 'outline'}
          onClick={() => setShowImport(false)}
        >
          Create New Site
        </Button>
        <Button
          variant={showImport ? 'default' : 'outline'}
          onClick={() => setShowImport(true)}
        >
          Import Existing Repository
        </Button>
      </div>

      {showImport ? <ImportSite /> : <CreateSite />}

      <hr className="border-border" />

      <SiteList />
    </div>
  );
};
