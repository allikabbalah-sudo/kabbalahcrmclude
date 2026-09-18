// Stub: MediaRecorder-based voice note recorder for session audio.
// On stop, upload the Blob to the `client-audio`/`program-audio` bucket at
// `{orgId}/{clientId}/{timestamp}.webm`, then call attachSessionMedia().
export function AudioRecorder({ onRecorded }: { onRecorded: (blob: Blob) => void }) {
  return (
    <button className="text-sm rounded-md border border-input px-3 py-2" disabled>
      הקלטת קול (בפיתוח)
    </button>
  );
}
