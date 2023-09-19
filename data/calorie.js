const request = require('request-promise');
const {Op} = require('sequelize');
const {apiSuccess, apiSuccessWithData, apiError} = require('./helpers/apiHelpers');
const {user_calorie, sequelize, Sequelize, payments} = require('./models');
const moment = require('moment');
exports.getMeal = async (req, res) => {
    try {
        request.get({
            url: 'https://api.calorieninjas.com/v1/nutrition?query=' + req.query.foods,
            headers: { 'X-Api-Key': 'tH8mkQRoZgj/hTG0qsKALg==xllI28ePKlvvOepY' }
        }).then(async response => {
            console.log(response);
            return res.status(200).json(apiSuccessWithData('Foods', JSON.parse(response)));
        }).catch(err => console.log(err));
    } catch (error) {
        console.log(error);
        return res.status(200).json(apiError(`Internal Server Error`));
    }
};
exports.addCalorie = async (req, res) => {
    let {grams, quantity} = req.body;
    try {
        request.get({
            url: 'https://api.api-ninjas.com/v1/nutrition?query=' + req.body.foods,
            headers: { 'X-Api-Key': 'tH8mkQRoZgj/hTG0qsKALg==cFVFFLKajZ09FRTU' }
        }).then(async response => {
            let data = JSON.parse(response);
            data.forEach(async element => {
                await user_calorie.create({
                    user_id: req.user.id,
                    food: element.name,
                    calorie: req.body.calorie,
                    day: new Date(),
                    meal_type: req.body.meal_type,
                    grams: grams,
                    quantity: quantity
                });
            });
            return res.status(200).json(apiSuccess('Calories Added'));
        }).catch(err => {
            return res.status(500).json(apiError(err));
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json(apiError('Internal Server Error'));
    }
};
exports.calculateCalorie = async (req, res) => {
    try {
        var days = 6;
        var date = new Date();
        let startDay = moment.utc(new Date()).startOf('day');
        let endDay = moment.utc(new Date()).endOf('day');
        let findCal = await user_calorie.findAll({
            where: {
                user_id: req.user.id,
                createdAt: {
                    [Op.between]: [
                        startDay,
                        endDay
                    ]
                }
            }
        });
        console.log(findCal);
        let breakfast = findCal.filter(bf => bf.meal_type == 'breakfast');
        let dinner = findCal.filter(dinner => dinner.meal_type == 'dinner');
        let lunch = findCal.filter(lunch => lunch.meal_type == 'lunch');
        let totalCalories = await user_calorie.sum('calorie', {
            where: {
                user_id: req.user.id,
                meal_type: { [Op.ne]: null },
                createdAt: {
                    [Op.between]: [
                        startDay,
                        endDay
                    ]
                }
            }
        });
        return res.status(200).json(apiSuccessWithData('Total calories', {
            totalCalories: totalCalories == null ? 0 : totalCalories,
            foodIntake: {
                breakfast: breakfast,
                lunch,
                dinner
            }
        }));
    } catch (error) {
        console.log(error);
        return res.status(200).json(apiError(`Internal Server Error`));
    }
};
function isValidYear(year) {
    var yearRegex = /^[0-9]{4}$/;
    return yearRegex.test(year);
}
function isValidMonth(month) {
    var yearRegex = /^[0-9]{2}$/;
    return yearRegex.test(month);
}
exports.calorieGrpah = async (req, res) => {
    try {
        let year = req.query.year || new Date().getFullYear();
        let currentYear = new Date().getFullYear();
        let month = req.query.month;
        let from = `${ year }-${ month }-01 00:00:00`;
        let to = `${ year }-${ month }-31 00:00:00`;
        console.log(typeof year);
        let startDate = moment.utc(new Date(from)).startOf('month');
        let endDate = moment.utc(new Date(to)).endOf('month');
        var months = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December'
        ];
        if (year && month == undefined) {
            if (!isValidYear(year))
                return res.status(401).json(apiError('Invalid year value'));
            let data = await sequelize.query(`select *,MONTHNAME(createdAt) as month,extract(YEAR from createdAt) as  year,sum(calorie) as totalCalorie from user_calories WHERE user_id=${ req.user.id } and meal_type is not null group by month having year =${ year }
;`);
            let arr = [];
            months.forEach(e => {
                let gen = data[0].find(item => item.month == e);
                if (gen !== undefined) {
                    arr.push(gen.totalCalorie);
                    console.log(gen);
                } else
                    arr.push(0);
            });
            return res.status(200).json(apiSuccessWithData(`Graph Of Calories`, arr));
        } else if (req.query.month) {
            if (!isValidMonth(month))
                return res.status(401).json(apiError('Invalid month value'));
            var now = new Date(to);
            var daysOfYear = [];
            let dateFormat = moment(new Date(from)).format('yyyy-mm-dd');
            for (var d = new Date(from); d <= now; d.setDate(d.getDate() + 1)) {
                daysOfYear.push(new Date(d));
            }
            console.log(daysOfYear);
            let data = await sequelize.query(`SELECT sum(calorie) as totalCalorie, DATE(createdAt) as dates FROM user_calories WHERE createdAt BETWEEN "${ from }" AND "${ to }"  and  user_id=${ req.user.id } and meal_type is not null  group by dates   ;`);
            console.log(data);
            let arr = [];
            daysOfYear.forEach(e => {
                console.log(e, 'day');
                let gen = data[0].find(item => {
                    let dateFormat = moment(new Date(item.createdAt)).format('YYYY-MM-DD');
                    let dateFormatE = moment(new Date(e)).format('YYYY-MM-DD');
                    if (item.dates == dateFormatE)
                        return item.dates == dateFormatE;
                });
                if (gen !== undefined) {
                    arr.push(gen.totalCalorie);
                    console.log(gen);
                } else
                    arr.push(0);
            });
            return res.status(200).json(apiSuccessWithData(`Graph Of Calories`, arr));
        }
    } catch (error) {
        console.log(error);
        return res.status(200).json(apiError(`Internal Server Error`));
    }
};
exports.deleteCalorie = async (req, res) => {
    try {
        let find = await user_calorie.findOne({
            where: {
                id: req.params.id,
                user_id: req.user.id
            }
        });
        if (!find)
            return res.status(404).json(apiError('No Record Found'));
        await find.destroy();
        return res.status(200).json(apiSuccess('Record deleted successfully'));
    } catch (error) {
        return res.status(500).json(apiError('Internal Server Error'));
    }
};