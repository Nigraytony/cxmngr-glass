function clampInt(value, { min, max, fallback }) {
  const n = Number.parseInt(String(value), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function getOprActiveWindowMinutes() {
  return clampInt(process.env.OPR_ACTIVE_WINDOW_MINUTES, { min: 1, max: 120, fallback: 15 })
}

function getOprMaxAnswersPerUserPerQuestion() {
  return clampInt(process.env.OPR_MAX_ANSWERS_PER_USER, { min: 1, max: 50, fallback: 10 })
}

function getOprDefaultAnswerWindowMinutes() {
  return clampInt(process.env.OPR_DEFAULT_ANSWER_WINDOW_MINUTES, { min: 1, max: 240, fallback: 10 })
}

function getOprDefaultVotingWindowMinutes() {
  return clampInt(process.env.OPR_DEFAULT_VOTING_WINDOW_MINUTES, { min: 1, max: 240, fallback: 10 })
}

function getOprTopN() {
  return clampInt(process.env.OPR_TOP_N, { min: 1, max: 50, fallback: 10 })
}

module.exports = {
  getOprActiveWindowMinutes,
  getOprMaxAnswersPerUserPerQuestion,
  getOprDefaultAnswerWindowMinutes,
  getOprDefaultVotingWindowMinutes,
  getOprTopN,
}

