import { useRef, useState } from 'react';
import { readNotes, removeNote, type FieldNote } from '../stories/notebook';
import { downloadFieldNote } from '../stories/exportNote';
import { MATERIALS } from '../stories/tunguska';
import { useStory } from '../state/story';

export function StoryNotebook() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [notes, setNotes] = useState<FieldNote[]>([]);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const open = () => {
    setPendingDelete(null);
    try { setNotes(readNotes(localStorage)); setError(''); }
    catch { setError('Saved notes could not be read. Existing data has been left intact.'); setNotes([]); }
    dialog.current?.showModal();
  };
  return <>
    <button className="btn notebook-launch" onClick={open}>Field notes</button>
    <dialog ref={dialog} className="story-notebook" aria-labelledby="notebook-heading">
      <header><div><span>Kept on this device</span><h2 id="notebook-heading">Your field notes</h2></div><button className="studio-close" aria-label="Close field notes" onClick={() => dialog.current?.close()}>×</button></header>
      <div className="notebook-content">
        <p>Save an experiment at the end of the Tunguska story. Download a note to keep a copy outside this browser.</p>
        {error ? <p role="alert">{error}</p> : notes.length === 0 ? <div className="notebook-empty"><h3>Your first observation starts here.</h3><p>Follow the event, change the material, and keep what you discover.</p><button className="story-primary" onClick={() => { dialog.current?.close(); useStory.getState().start(); }}>Experience Tunguska</button></div> : <ul className="note-list">{notes.map(note => <li key={note.id}>
          <time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString()}</time><h3>{note.title}</h3><p>{MATERIALS.find(m => m.value === note.material)?.label} experiment · {note.distanceKm} km observer</p>
          <div className="note-actions"><button className="btn" onClick={() => { dialog.current?.close(); useStory.getState().start(note.material, note.distanceKm, 4); }}>Reopen experiment</button><button className="btn" onClick={() => downloadFieldNote(note)}>Download note</button>
          {pendingDelete === note.id ? <><button className="text-button" onClick={() => { try { setNotes(removeNote(localStorage, note.id)); setPendingDelete(null); } catch { setError('This note could not be removed. Try again.'); } }}>Confirm removal</button><button className="text-button" onClick={() => setPendingDelete(null)}>Cancel</button></> : <button className="text-button" onClick={() => setPendingDelete(note.id)}>Remove</button>}</div>
        </li>)}</ul>}
        <p className="model-note">Notes preserve saved results. Reopening an experiment recalculates with the installed model. Clearing this site's data removes its local notebook.</p>
      </div>
    </dialog>
  </>;
}
