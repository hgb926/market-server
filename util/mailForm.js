const makeMailBody = (code) => {
    return "<div style=\"font-family: Arial, sans-serif; margin: 0 auto; width: 100%; max-width: 600px; padding: 20px; background-color: #f4f4f4;\">" +
        "<div style=\"background-color: #ffffff; padding: 40px; border-radius: 10px; text-align: center;\">" +
        "<h1 style=\"font-size: 24px; font-weight: bold; color: #333333;\">이메일 주소 인증 코드</h1>" +
        "<p style=\"font-size: 16px; color: #666666;\">안녕하세요.</p>" +
        "<p style=\"font-size: 16px; color: #666666;\">서비스 이용을 위해 이메일 주소 인증을 요청하셨습니다.</p>" +
        "<p style=\"font-size: 16px; color: #666666;\">아래 코드를 입력해 인증을 완료하시면, 서비스를 이용하실 수 있습니다.</p>" +
        "<div style=\"margin: 20px 0; font-size: 22px; font-weight: bold; color: #333333;\">" +
        "인증 코드: <span style=\"font-weight: 700; letter-spacing: 5px; font-size: 30px; color: #14332C;\">" + code + "</span>" +
        "</div>" +
                                   "</a>" +
        "<p style=\"font-size: 12px; color: #999999; margin-top: 20px;\">⚠ 인증은 5분 이내 완료해주세요.</p>" +
        "</div>" +
        "</div>";
}

module.exports = {makeMailBody}