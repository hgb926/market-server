const searchService = require('../services/searchService');



const addHistory = async (req, res) => {
    console.log(req.body)
    try {
        const result = await searchService.addHistory(req.body);
        if (result) {
            res.status(200).json(result);
        } else {
            res.status(500).json({message: '서버 오류'})
        }
    } catch (e) {
        console.error(e)
        res.status(400).json({message:'검색 기록 추가에 실패하였습니다'});
    }
}

const getHistories = async (req, res) => {
    try {
        const result = await searchService.getHistories(req.params.id);
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(400).json({message: '기록을 찾지 못하였습니다'});
    }
}



module.exports = {
    addHistory,
    getHistories,
};