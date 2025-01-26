const formatRelativeTime = (diffInMs) => {
    const seconds = Math.floor(diffInMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
        return '방금 전';
    } else if (minutes < 60) {
        return `${minutes}분 전`;
    } else if (hours < 24) {
        return `${hours}시간 전`;
    } else {
        return `${days}일 전`;
    }
}

const formatSendTime = (time) => {
    let str = ''
    let hours = time.getHours();
    let minutes = ("" + time.getMinutes()).length !== 2 ? "0" + time.getMinutes() : time.getMinutes();
    if (hours > 12) {
        hours = hours - 12
        str = '오후'
    } else {
        str = '오전'
    }
    const fullDate = time.getFullYear()+'년 '+ time.getMonth()+1+'월 ' + time.getDate()+"일"
    return [`${fullDate}`, `${str} ${hours}:${minutes}`]
}

const formatMonthAndDay = (time) => time.getMonth()+1+'.' + time.getDate()

module.exports = {formatRelativeTime, formatSendTime, formatMonthAndDay}