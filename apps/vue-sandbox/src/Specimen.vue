<!--
  One labelled specimen on the page. The Vue twin of the `Specimen` function inside the React
  sandbox's App.tsx — hand-written, not generated, because the harness is not a component library.
-->

<script setup lang="ts">
defineProps<{
  /** What to call this specimen. */
  name: string;
  /** The contract it anchors to, for the deep link from the parity board. */
  of: string;
  /** What the specimen is showing, and what is worth looking at. */
  note: string;
}>();
</script>

<template>
  <section class="specimen" :id="`specimen-${of}`">
    <h2>{{ name }}</h2>
    <p class="specimen-note">{{ note }}</p>
    <div class="specimen-row">
      <slot />
    </div>
  </section>
</template>
