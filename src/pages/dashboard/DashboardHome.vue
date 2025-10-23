<template>
  <section class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <LiquidGlassCard />
    <div class="rounded-2xl p-6 bg-white/10 backdrop-blur-xl border border-white/20 ring-1 ring-white/10">
      <h3 class="text-lg font-semibold">Collapsible Sidebar</h3>
      <p class="text-white/80 mt-2">Use the  button on the topbar or the chevron on the sidebar to collapse/expand.</p>
    </div>
    <div class="rounded-2xl p-6 bg-white/10 backdrop-blur-xl border border-white/20 ring-1 ring-white/10">
      <h3 class="text-lg font-semibold">Protected Routes</h3>
      <p class="text-white/80 mt-2">This dashboard requires auth (mocked with localStorage).</p>
    </div>
    <!-- Issues component demo -->
    <Issues :issues="demoIssues" @open="openIssue" />
  </section>
</template>

<script setup>
import LiquidGlassCard from '../../components/LiquidGlassCard.vue'
import Issues from '../../components/Issues.vue'

const demoIssues = [
  { id: 101, title: 'Login button not visible', description: 'Login button overlaps header on small screens', severity: 'medium' },
  { id: 102, title: 'API timeout', description: 'Data calls occasionally timeout in staging', severity: 'high' },
  { id: 103, title: 'Typo in footer', description: 'Footer has a misspelled word', severity: 'low' },
]

function openIssue(issue) {
  // demo action: alert the issue title (replace with modal or navigation)
  alert(`Open issue #${issue.id}: ${issue.title}`)
}
</script>
