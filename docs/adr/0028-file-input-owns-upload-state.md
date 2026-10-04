# `FileInput` owns upload state, and is inert in native forms

`FileInput` is a native `<input type="file">` with a drop zone and a row per file. Whether it also
sends the files, and who holds the list of rows, are the questions this ADR settles. A file input
that only reports `File` objects leaves every consumer to rebuild the same machinery: a row per
file, progress, failure, cancellation on removal, late results from a transport that ignores its
abort signal.

## Decisions

- **The component owns the uploads.** `upload(file, { onProgress, signal })` returns a promise.
  Resolving marks the row done and stores the value as its `result`; rejecting marks it failed
  with the error's message. A function that never calls `onProgress` leaves the row's `Progress`
  indeterminate. `signal` is aborted when the row is removed or the component unmounts, and a
  settlement or progress tick that arrives afterwards is dropped. This departs from the rest of the
  package, where no other component touches the network. The departure is bounded: `FileInput`
  picks no transport, never sees a URL, a header or a request body, and calls the one function the
  consumer supplies.
- **The list is uncontrolled.** There is no `value` or `defaultValue`. `onChange(entries)` reports
  the rows; it does not accept them. The props type omits `value`, `defaultValue` and the native
  `onChange`.
- **Picks and drops append.** Each new file starts uploading immediately, from the event handler
  and never from an effect: StrictMode's simulated remount runs an effect's cleanup, which would
  abort an upload the effect had just started, whereas a handler runs once. The native input's
  value is reset to `""` after every pick, so picking the same file twice fires `change` twice.
  A row's remove button aborts its in-flight upload.
- **`onChange` fires on add, status change and removal.** It does not fire per progress tick. A
  consumer that mirrors the entries into state would otherwise re-render the surrounding tree on
  every tick of every upload; progress is drawn by the row's `Progress`, which the component
  re-renders itself.
- **Inert in native forms.** The props type omits `name`, `form`, `required` and `type`, so the
  input never submits with a surrounding `<form>`. The files go through `upload`; the form value
  is whatever the consumer stores from the upload results, such as an id returned by the server.
  A `required` attribute would block submission on an input whose files have already been sent.
- **`FieldShell` is not composed.** `FieldShell` is the keystone of the text-entry controls (see
  "The field shell is one component, and every text-entry control composes it"): a bordered box
  around one value the user types. A `FileInput` holds no typed value, its chrome is a drop zone
  and a list of rows, and the states `FieldShell` draws, a focus ring on a text box and an
  invalid border, do not describe it. It draws its own zone, and takes `FormField`'s cloned `id`
  and `aria-*` props on the native input.

## Considered options

- **Consumer-owned progress and list** (a controlled `value` of entries, with the consumer
  uploading and reporting progress back) — the recommended option, and rejected. It keeps the
  package off the network entirely and leaves the consumer total control of the list. Every
  consumer then writes the same row state machine, and the cases that are easy to get wrong
  (removal during an upload, a result arriving after removal or unmount, progress moving
  backwards) are written, or missed, once per consumer. Owning them in one place, behind a single
  function, was judged worth the departure.
- **A transport inside the component** (a `url` and `headers` props) — rejected: it chooses
  `fetch` or `XMLHttpRequest` for every consumer, and `fetch` reports no upload progress.
- **Starting uploads from an effect watching the list** — rejected: StrictMode's simulated
  remount aborts and restarts it, so an upload could be sent twice or cancelled.
- **Submitting through the native form** (`name` on the input) — rejected: it submits files that
  have already been uploaded, a second time.
