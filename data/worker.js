const {parentPort, workerData} = require('worker_threads');
const {apiError, apiSuccess} = require('./helpers/apiHelpers');
const {reminder_settings, session, sequelize, reminder_logs} = require('./models');
const SendPushNotification = require('./utils/pushNotification');
const moment = require('moment');
const {Op} = require('sequelize');
var JobQueue = require('mini-queue/lib/job-queue');
const waterReminder = async () => {
    try {
        let currentDay = moment().format('ddd');
        let escapeSearch = sequelize.escape(currentDay);
        console.log(escapeSearch);
        let reminders = await reminder_settings.findAll({
            attributes: {
                include: [
                    [
                        sequelize.literal(`(select IFNULL(count(id),0)  from reminder_logs where reminder_settings.user_id = reminder_logs.user_id AND  type ="water" AND (DATE(reminder_logs.createdAt) >= DATE(NOW()) AND DATE(createdAt) <= DATE(NOW())) )`),
                        'todays_count'
                    ],
                    [
                        sequelize.literal(`(select reminder_logs.createdAt from reminder_logs where reminder_settings.id = reminder_logs.reminder_id AND type ="water" AND (DATE(createdAt) >= DATE(NOW()) AND DATE(createdAt) <= DATE(NOW()) ) ORDER BY id desc LIMIT 1)`),
                        'todays_last_reminder'
                    ]
                ]
            },
            include: ['users'],
            where: {
                [Op.or]: [
                    sequelize.where(sequelize.col('reminder_days'), Op.like, `%${ currentDay }%`),
                    sequelize.where(sequelize.col('reminder_days'), Op.like, `%daily%`)
                ],
                status: 1,
                reminder_type: 'water'
            },
            having: { todays_count: { [Op.lt]: sequelize.col('reminder_times') } }
        });
        let currentTime = new Date();
        reminders.forEach((reminder, index) => {
            let {todays_last_reminder, reminder_interval, createdAt} = reminder.dataValues;
            let nextReminder = new Date(todays_last_reminder);
            nextReminder.setTime(nextReminder.getTime() + reminder_interval * 60000);
            if (!todays_last_reminder) {
                nextReminder = new Date();
            }
            if (reminder.dataValues.todays_count >= reminder.dataValues.reminder_times) {
                reminders.splice(index, 1);
            }
            if (nextReminder > currentTime) {
                reminders.splice(index, 1);
            }
        });
        if (reminders.length > 0) {
            let userIds = reminders.map(reminder => reminder.user_id);
            let reminderLogsData = reminders.map(reminder => ({
                reminder_id: reminder.id,
                user_id: reminder.user_id,
                type: 'water'
            }));
            await reminder_logs.bulkCreate(reminderLogsData);
            let tokens = await session.findAll({ where: { user_id: { [Op.in]: userIds } } });
            let queue = new JobQueue({
                activeLimit: 5,
                queuedLimit: -1
            });
            var job = queue.createJob({
                group: 'group',
                name: 'name'
            });
            job.on('process', function (jobDone, job) {
                console.log(Date.now());
                SendPushNotification(tokens, {
                    title: `Reminder for Water `,
                    body: 'Reminder notification'
                }, { type: 'Water' });
                return jobDone();
            });
        }
        parentPort.postMessage(apiSuccess('Water Reminder Alert'));
    } catch (error) {
        throw new Error(error.message);
    }
};
const workoutReminder = async () => {
    try {
        let currentDay = moment().format('ddd');
        console.log(currentDay);
        let escapeSearch = sequelize.escape(currentDay);
        console.log(escapeSearch);
        let where = {
            reminder_type: 'workout',
            status: 1,
            createdAt: {
                [Op.gt]: moment.utc(new Date()).startOf('day'),
                [Op.lt]: moment.utc(new Date()).endOf('day')
            }
        };
        let reminders = await reminder_settings.findAll({
            attributes: {
                include: [
                    [
                        sequelize.literal(`(select IFNULL(count(id),0)  from reminder_logs where reminder_settings.user_id = reminder_logs.user_id AND  type ="workout" AND (DATE(reminder_logs.createdAt) >= DATE(NOW()) AND DATE(createdAt) <= DATE(NOW())) )`),
                        'todays_count'
                    ],
                    [
                        sequelize.literal(`(select reminder_logs.createdAt from reminder_logs where reminder_settings.id = reminder_logs.reminder_id AND type ="workout" AND (DATE(createdAt) >= DATE(NOW()) AND DATE(createdAt) <= DATE(NOW()) ) ORDER BY id desc LIMIT 1)`),
                        'todays_last_reminder'
                    ]
                ]
            },
            include: ['users'],
            where: {
                [Op.and]: [
                    sequelize.where(sequelize.col('reminder_days'), Op.like, `%${ currentDay }%`),
                    { status: { [Op.eq]: 1 } }
                ],
                reminder_type: 'workout',
                done_at: null
            },
            having: { todays_count: { [Op.lt]: sequelize.col('reminder_times') } }
        });
        console.log(reminders);
        let currentTime = new Date();
        reminders.forEach((reminder, index) => {
            let {id, todays_last_reminder, workout_time, reminder_interval} = reminder.dataValues;
            let nextReminder = new Date(todays_last_reminder);
            nextReminder.setTime(nextReminder.getTime() + reminder_interval * 60000);
            if (!todays_last_reminder) {
                nextReminder = new Date(workout_time);
                console.log('todays_last_reminder', todays_last_reminder, 'nextReminder', nextReminder);
            }
            if (reminder.dataValues.todays_count >= reminder.dataValues.reminder_times) {
                reminders.splice(index, 1);
            }
            if (nextReminder > currentTime) {
                reminders.splice(index, 1);
            }
        });
        if (reminders.length > 0) {
            let userIds = reminders.map(reminder => reminder.user_id);
            let reminderLogsData = reminders.map(reminder => ({
                reminder_id: reminder.id,
                user_id: reminder.user_id,
                type: 'workout'
            }));
            await reminder_logs.bulkCreate(reminderLogsData);
            let tokens = await session.findAll({ where: { user_id: { [Op.in]: userIds } } });
            let queue = new JobQueue({
                activeLimit: 5,
                queuedLimit: -1
            });
            var job = queue.createJob({
                group: 'group',
                name: 'name'
            });
            job.on('process', function (jobDone, job) {
                console.log(Date.now());
                SendPushNotification(tokens, {
                    title: `Reminder for Workout `,
                    body: 'Reminder notification'
                }, { type: 'workout' });
                return jobDone();
            });
        }
        parentPort.postMessage(apiSuccess('Workout Reminder Alert'));
    } catch (error) {
        parentPort.postMessage(apiError(error.message));
    }
};
const resetReminder = async () => {
    try {
        let currentDay = moment().format('ddd');
        let getDay = await reminder_settings.findOne({
            where: {
                [Op.and]: [
                    sequelize.where(sequelize.col('reminder_days'), Op.like, `%${ currentDay }%`),
                    { status: { [Op.eq]: 1 } },
                    { done_at: { [Op.ne]: null } }
                ]
            }
        });
        if (getDay) {
            await reminder_settings.update({ done_at: null }, {
                where: {
                    [Op.and]: [
                        { done_at: { [Op.lte]: moment.utc() } },
                        sequelize.where(sequelize.col('reminder_days'), Op.like, `%${ currentDay }%`)
                    ]
                }
            });
        }
        parentPort.postMessage(apiSuccess('Reminder Reset'));
    } catch (error) {
        console.log(error);
        parentPort.postMessage(apiError(error.message));
    }
};
switch (workerData.type) {
case 'water':
    waterReminder();
    break;
case 'workout':
    workoutReminder();
    break;
default:
    resetReminder();
    break;
}