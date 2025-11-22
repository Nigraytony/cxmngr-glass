export async function loadGantt() {
  // Import CSS so Vite includes it in the bundle
  await import('frappe-gantt/dist/frappe-gantt.css')
  // Load the dist JS as raw text and evaluate it to retrieve the Gantt symbol
  const module = await import('frappe-gantt/dist/frappe-gantt.js?raw')
  const code = module.default || module
  // Evaluate in a new function scope and return the Gantt variable
  const Gantt = (new Function(code + '\nreturn Gantt;'))()
  return Gantt
}
