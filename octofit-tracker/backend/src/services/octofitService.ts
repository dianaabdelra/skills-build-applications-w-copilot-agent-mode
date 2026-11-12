import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('Activity details are required');
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (!isObjectId(userId) || !isObjectId(teamId)) {
    throw badRequest('Valid userId and teamId are required');
  }
  if (typeof type !== 'string' || !type.trim()) {
    throw badRequest('Activity type is required');
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw badRequest('Activity minutes must be a positive number');
  }

  const [user, team] = await Promise.all([
    User.findById(userId).select('_id'),
    Team.findById(teamId).select('_id'),
  ]);
  if (!user || !team) {
    throw badRequest('Activity user and team must exist');
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('Team details are required');
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim()) {
    throw badRequest('Team name is required');
  }
  if (typeof mascot !== 'string' || !mascot.trim()) {
    throw badRequest('Team mascot is required');
  }
  if (!Array.isArray(members) || !members.every(isObjectId)) {
    throw badRequest('Team members must be an array of valid user IDs');
  }

  const uniqueMemberIds = [...new Set(members)];
  const existingMembers = await User.countDocuments({ _id: { $in: uniqueMemberIds } });
  if (existingMembers !== uniqueMemberIds.length) {
    throw badRequest('Team members must exist');
  }

  return Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: uniqueMemberIds,
  });
}

export async function getLeaderboard() {
  const teams = await Team.find().select('_id name').lean();
  const totals = await Activity.aggregate<{ _id: typeof teams[number]['_id']; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  const leaderboard = teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: pointsByTeam.get(team._id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints);

  return leaderboard.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).select('_id fitnessGoal').lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const recentActivity = await Activity.findOne({ user: user._id })
    .sort({ occurredAt: -1 })
    .select('type')
    .lean();
  const focus = recentActivity?.type === 'run' || recentActivity?.type === 'cycle'
    ? 'endurance'
    : recentActivity?.type === 'strength'
      ? 'strength'
      : user.fitnessGoal;
  const reason = recentActivity
    ? `Recommended based on your recent ${recentActivity.type} activity.`
    : `Recommended to support your ${user.fitnessGoal} fitness goal.`;
  const workouts = await Workout.find().lean();
  return [
    ...workouts.filter((workout) => workout.focus.toLowerCase() === focus.toLowerCase()),
    ...workouts.filter((workout) => workout.focus.toLowerCase() !== focus.toLowerCase()),
  ].map((workout) => ({ ...workout, reason }));
}

export { User };
