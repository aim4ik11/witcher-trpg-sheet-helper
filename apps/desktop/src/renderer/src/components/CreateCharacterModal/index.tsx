import { useState, useEffect } from 'react';
import type { Character } from '@wilmak/shared';
import { normalizeNickname } from '../../utils/session';
import { RaceSelect, OccupationSelect } from '../RaceOccupationSelect';
import './CreateCharacterModal.css';

interface Props {
  type: 'player' | 'enemy';
  onSubmit: (data: Partial<Character>) => void;
  onClose: () => void;
}

export default function CreateCharacterModal({ type, onSubmit, onClose }: Props) {
  const isPlayer = type === 'player';
  const [name, setName] = useState('');
  const [race, setRace] = useState('');
  const [occupation, setOccupation] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) { setError('Name is required.'); return; }
    if (isPlayer) {
      const nick = normalizeNickname(nickname);
      if (!nick) { setError('Nickname is required so the player can log in.'); return; }
      onSubmit({ name: n, race, occupation, nickname: nick, type: 'player' });
    } else {
      onSubmit({ name: n, race, occupation, type: 'enemy' });
    }
  }

  return (
    <div className="create-modal-backdrop" onClick={onClose} role="presentation">
      <div className="create-modal panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="create-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="create-modal-title">{isPlayer ? 'New Player Character' : 'New Enemy / NPC'}</h2>
        <form onSubmit={handleSubmit} className="create-modal-form">
          <label>
            Name <span className="required">*</span>
            <input value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="e.g. Geralt of Rivia" autoFocus />
          </label>
          <label>Race <RaceSelect value={race} onChange={setRace} /></label>
          <label>Occupation <OccupationSelect value={occupation} onChange={setOccupation} /></label>
          {isPlayer && (
            <label>
              Player nickname <span className="required">*</span>
              <input
                value={nickname}
                onChange={(e) => { setNickname(normalizeNickname(e.target.value)); setError(''); }}
                placeholder="e.g. geralt — used to log in"
                autoComplete="off"
              />
            </label>
          )}
          {error && <p className="create-modal-error">{error}</p>}
          <div className="create-modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary">Create</button>
          </div>
        </form>
      </div>
    </div>
  );

}