import { useState, useEffect } from 'react';
import { RaceSelect, OccupationSelect } from './RaceOccupationSelect';
import './CreateCharacterModal.css';

const EMPTY_PLAYER = { name: '', race: '', occupation: '', nickname: '' };
const EMPTY_NPC = { name: '', race: '', occupation: '' };

export default function CreateCharacterModal({ type, onSubmit, onClose }) {
  const isPlayer = type === 'player';
  const [form, setForm] = useState(isPlayer ? EMPTY_PLAYER : EMPTY_NPC);
  const [error, setError] = useState('');

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError('Name is required.');
      return;
    }
    if (isPlayer) {
      const nickname = form.nickname.trim().toLowerCase().replace(/\s/g, '');
      if (!nickname) {
        setError('Nickname is required so the player can log in.');
        return;
      }
      onSubmit({
        name,
        race: form.race,
        occupation: form.occupation,
        nickname,
        type: 'player',
      });
    } else {
      onSubmit({
        name,
        race: form.race,
        occupation: form.occupation,
        type: 'enemy',
      });
    }
  }

  return (
    <div className="create-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="create-modal panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-modal-title"
      >
        <button type="button" className="create-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 id="create-modal-title" className="create-modal-title">
          {isPlayer ? 'New Player Character' : 'New Enemy / NPC'}
        </h2>

        <form onSubmit={handleSubmit} className="create-modal-form">
          <label>
            Name <span className="required">*</span>
            <input
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Geralt of Rivia"
              autoFocus
            />
          </label>

          <label>
            Race
            <RaceSelect value={form.race} onChange={(v) => setField('race', v)} />
          </label>

          <label>
            Occupation
            <OccupationSelect value={form.occupation} onChange={(v) => setField('occupation', v)} />
          </label>

          {isPlayer && (
            <label>
              Player nickname <span className="required">*</span>
              <input
                value={form.nickname}
                onChange={(e) => setField('nickname', e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="e.g. geralt — used to log in"
                autoComplete="off"
                autoCapitalize="off"
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
