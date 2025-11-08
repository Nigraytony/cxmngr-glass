<template>
  <section class="space-y-6 relative">
    <!-- Breadcrumbs -->
    <div>
      <BreadCrumbs :items="[{ text: 'Dashboard', to: '/' }]" title="Dashboard" />
    </div>

    <!-- Main dashboard grid -->
    <ProjectDashboardCharts />
  </section>
</template>

<script setup>
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import ProjectDashboardCharts from '../../components/charts/ProjectDashboardCharts.vue'

// Dashboard now driven by live project data via charts component
</script>
