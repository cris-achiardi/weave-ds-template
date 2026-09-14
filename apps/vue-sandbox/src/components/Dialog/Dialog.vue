<!--
  GENERATED from Dialog.contract.json + Dialog.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs Dialog --out <dir>

  Interrupts what a person was doing to ask for something that cannot wait, and refuses to let them continue until they answer or leave.
-->

<script lang="ts">
/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface DialogProps {
  /** How wide the panel is. A contiguous subset of the canon's ladder. Defaults to `m`. */
  size?: 's' | 'm' | 'l';
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useId, watchEffect } from 'vue';
import { useDismissal } from '@ds/vue/behavior';
import type { DismissalOptions } from '@ds/vue/behavior';
import './Dialog.structure.css';
import './Dialog.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'Dialog', inheritAttrs: false });

withDefaults(defineProps<DialogProps>(), {
  size: 'm',
});

/** The dialog is showing and holding focus. Two-way: `v-model:open`. */
const open = defineModel<boolean>('open', { default: false });

defineSlots<{
  /** The component content. */
  default?(): unknown;
  /** What the dialog is asking about. Required: it is the dialog's accessible name. */
  title(): unknown;
  /** The content. Fills the `body` part. */
  body(): unknown;
  /** The buttons that resolve it. Fills the `actions` part. */
  actions?(): unknown;
}>();

const baseId = useId();

// A <dialog> is opened by CALLING showModal(), never by rendering an attribute. The
// watcher is `flush: 'post'` so the element exists when it runs; the React emitter
// reaches for useEffect at exactly this point and for exactly this reason.
const dialogEl = ref<HTMLDialogElement | null>(null);

watchEffect(
  () => {
    const node = dialogEl.value;
    if (!node) return;
    // `open` reflects showModal() having been called, so it is also the guard
    // against calling it twice.
    if (open.value && !node.open) node.showModal();
    else if (!open.value && node.open) node.close();
  },
  { flush: 'post' },
);

// The dialog closes ITSELF on Escape, so this component is no longer the only writer
// of its own state. Without this the platform would hide the element while `open`
// stayed true, and the next open would be a no-op.
//
// Synced from the ELEMENT's own `open` attribute, not from a `close` event —
// measured unreliable in Chrome and documented as such by a11y-dialog. Observing the
// attribute reads what is TRUE and catches every way the platform can close this
// element behind the component's back.
function handleClose() {
  // Guarded, or a close that has already been recorded emits `update:open` a
  // second time and a consumer counting dismissals counts two.
  if (open.value) open.value = false;
}

let openObserver: MutationObserver | null = null;
onMounted(() => {
  const node = dialogEl.value;
  if (!node) return;
  openObserver = new MutationObserver(() => {
    if (!node.open) handleClose();
  });
  openObserver.observe(node, { attributes: true, attributeFilter: ['open'] });
});
onBeforeUnmount(() => openObserver?.disconnect());

// Transcribed from Dialog.contract.json > dismisses. The cases this commits us to
// are in @ds/contracts/conformance/dismissal.json.
//
// The contract also declares escape, which is NOT generated: the
// platform supplies it for a <dialog>. See @ds/platform-web > visibility.supplies.
const DISMISSAL: DismissalOptions = {
  on: ['outside-press'],
};

// A platform modal is closed BY THE ELEMENT, never by writing the state: writing it
// would run the watcher, which calls close(), which the observer sees — two
// notifications for one dismissal. One close path, one place to look.
const dismissOpen = () => dialogEl.value?.close();
const dismissal = useDismissal(DISMISSAL, () => open.value, dismissOpen);

const attrs = useAttrs();
// Everything a consumer passed that this component does not compose by hand. The
// composed ones are pulled out here and called FIRST inside each handler below, so a
// consumer can preventDefault() and win — the ordering emit/README.md §5 requires.
const fallthrough = computed(() => {
  const rest: Record<string, unknown> = { ...attrs };
  delete rest['onClick'];
  delete rest['onPointercancel'];
  delete rest['onPointerdown'];
  return rest;
});

function onRootPointerdown(event: PointerEvent) {
  (attrs['onPointerdown'] as ((e: PointerEvent) => void) | undefined)?.(event);
  dismissal.onPointerDown(event);
}

function onRootPointercancel(event: PointerEvent) {
  (attrs['onPointercancel'] as ((e: PointerEvent) => void) | undefined)?.(event);
  dismissal.onPointerCancel();
}

function onRootClick(event: MouseEvent) {
  (attrs['onClick'] as ((e: MouseEvent) => void) | undefined)?.(event);
  dismissal.onClick(event);
}
</script>

<template>
  <dialog
    v-bind="fallthrough"
    ref="dialogEl"
    :id="baseId"
    :data-ds-state-open="open || undefined"
    :data-ds-size="size"
    :aria-labelledby="`${baseId}-title`"
    data-ds-component="Dialog"
    data-ds-part="root"
    @pointerdown="onRootPointerdown"
    @pointercancel="onRootPointercancel"
    @click="onRootClick"
  >
    <div :id="`${baseId}-title`" data-ds-part="title">
      <slot name="title" />
    </div>
    <div data-ds-part="body">
      <slot name="body" />
    </div>
    <div data-ds-part="actions">
      <slot name="actions" />
    </div>
    <slot />
  </dialog>
</template>
