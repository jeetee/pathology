import { Types } from 'mongoose';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Role from '../../constants/role';
import { AppContext } from '../../contexts/appContext';
import useTextAreaWidth from '../../hooks/useTextAreaWidth';
import useUser from '../../hooks/useUser';
import Collection from '../../models/db/collection';
import Level from '../../models/db/level';
import Modal from '.';

interface AddLevelModalProps {
  closeModal: () => void;
  collections: Collection[] | undefined;
  isOpen: boolean;
  level: Level | undefined;
}

export default function AddLevelModal({ closeModal, collections, isOpen, level }: AddLevelModalProps) {
  const [authorNote, setAuthorNote] = useState<string>();
  const [name, setName] = useState<string>();
  const { setIsLoading } = useContext(AppContext);
  const { user } = useUser();
  const [collectionIds, setCollectionIds] = useState<string[]>([]);

  useEffect(() => {
    if (!level) {
      setAuthorNote(undefined);
      setName(undefined);

      return;
    }

    setAuthorNote(level.authorNote);
    setName(level.name);
  }, [level]);

  useEffect(() => {
    if (!level || !collections) {
      setCollectionIds([]);
    } else {
      const newCollectionIds = [];

      for (let i = 0; i < collections.length; i++) {
        const levels = collections[i].levels as Types.ObjectId[];

        if (levels.includes(level._id)) {
          newCollectionIds.push(collections[i]._id.toString());
        }
      }

      setCollectionIds(newCollectionIds);
    }
  }, [collections, level]);

  function onSubmit() {
    if (!name || name.length === 0) {
      toast.dismiss();
      toast.error('Error: Name is required', {
        duration: 3000
      });

      return;
    }

    if (name.length > 50) {
      toast.dismiss();
      toast.error('Error: Name cannot be longer than 50 characters', {
        duration: 3000,
      });

      return;
    }

    setIsLoading(true);
    toast.loading(level ? 'Updating level...' : 'Adding level...');

    fetch(level ? `/api/level/${level._id}` : '/api/level', {
      method: level ? 'PUT' : 'POST',
      body: JSON.stringify({
        authorNote: authorNote,
        collectionIds: collectionIds,
        name: name,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (res.status === 200) {
        toast.dismiss();
        toast.success(level ? 'Updated' : 'Added');
        closeModal();
      } else {
        throw res.text();
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error);
    }).finally(() => {
      setIsLoading(false);
    });
  }

  function onCollectionIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    const collectionId = e.currentTarget.value;

    setCollectionIds(prevCollectionIds => {
      const newCollectionIds = [...prevCollectionIds];
      const index = newCollectionIds.indexOf(collectionId);

      if (index > -1) {
        newCollectionIds.splice(index, 1);
      } else {
        newCollectionIds.push(collectionId);
      }

      return newCollectionIds;
    });
  }

  const collectionDivs: JSX.Element[] = [];
  const officialCollectionDivs: JSX.Element[] = [];

  if (collections) {
    if (user?.roles?.includes(Role.CURATOR)) {
      const officialCollections = collections.filter(collection => !collection.userId);

      for (let i = 0; i < officialCollections.length; i++) {
        const collectionId = officialCollections[i]._id.toString();

        officialCollectionDivs.push(<div key={`official-collection-${collectionId}`}>
          <input
            checked={collectionIds.includes(collectionId)}
            name='collection'
            onChange={onCollectionIdChange}
            style={{
              margin: '0 10px 0 0',
            }}
            type='checkbox'
            value={collectionId}
          />
          {officialCollections[i].name}
        </div>);
      }
    }

    const userCollections = collections.filter(collection => collection.userId);

    for (let i = 0; i < userCollections.length; i++) {
      const collectionId = userCollections[i]._id.toString();

      collectionDivs.push(<div key={`collection-${collectionId}`}>
        <input
          checked={collectionIds.includes(collectionId)}
          name='collection'
          onChange={onCollectionIdChange}
          style={{
            margin: '0 10px 0 0',
          }}
          type='checkbox'
          value={collectionId}
        />
        {userCollections[i].name}
      </div>);
    }
  }

  const isUsersLevel = !level || level.userId._id === user?._id || level.userId === user?._id;
  const tw = useTextAreaWidth();
  const titlePrefix = `${level ? 'Edit' : 'New'} Level`;

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title={!isUsersLevel ? 'Add to...' : titlePrefix}
    >
      <>
        {isUsersLevel && <>
          <div>
            <label className='font-bold' htmlFor='name'>Name:</label>
            <input
              name='name'
              onChange={e => setName(e.target.value)}
              placeholder={`${level ? 'Edit' : 'Add'} name...`}
              required
              style={{
                color: 'rgb(0, 0, 0)',
                margin: 8,
              }}
              type='text'
              value={name}
            />
          </div>
          <div>
            <label className='font-bold' htmlFor='authorNote'>Author Note:</label>
            <br />
            <textarea
              className='p-1 rounded-md'
              name='authorNote'
              onChange={e => setAuthorNote(e.target.value)}
              placeholder={`${level ? 'Edit' : 'Add'} author note...`}
              rows={4}
              style={{
                color: 'rgb(0, 0, 0)',
                margin: '8px 0',
                resize: 'none',
                width: tw,
              }}
              value={authorNote}
            />
          </div>
        </>}
        {collectionDivs.length === 0 ? <div>You do not have any collections.<br /><Link href='/create'><a className='underline'>Create</a></Link> a collection.</div> :
          <div>
            <span className='font-bold'>Collections:</span>
            {collectionDivs}
          </div>
        }
        {officialCollectionDivs.length !== 0 &&
          <div className='mt-2'>
            <span className='font-bold'>Official Collections:</span>
            {officialCollectionDivs}
          </div>
        }
      </>
    </Modal>
  );
}
