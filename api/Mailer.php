<?php
require_once __DIR__ . '/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

class Mailer {

    // Wraps email content in a branded layout matching the app's look and feel.
    private static function renderTemplate($heading, $bodyHtml, $ctaText = null, $ctaUrl = null) {
        $year = date('Y');
        $cta = '';

        if ($ctaText && $ctaUrl) {
            $cta = '
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px auto 8px;">
                <tr>
                    <td align="center" bgcolor="#283655" style="border-radius: 8px;">
                        <a href="' . htmlspecialchars($ctaUrl) . '" target="_blank"
                           style="display: inline-block; padding: 14px 32px; font-family: Arial, Helvetica, sans-serif;
                                  font-size: 15px; font-weight: bold; color: #ffffff; text-decoration: none;
                                  border-radius: 8px; background: #283655;
                                  background: linear-gradient(135deg, #4a6fa5 0%, #283655 55%, #0b0c10 100%);">
                            ' . htmlspecialchars($ctaText) . '
                        </a>
                    </td>
                </tr>
            </table>';
        }

        return '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Faith Fast</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; padding: 32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 15px rgba(0,0,0,0.08);">
                    <tr>
                        <td align="center" bgcolor="#283655" style="background: #283655; background: linear-gradient(135deg, #4a6fa5 0%, #283655 55%, #0b0c10 100%); padding: 32px 24px;">
                            <div style="font-family: Arial, Helvetica, sans-serif; font-size: 26px; font-weight: bold; color: #ffffff; letter-spacing: 0.5px;">Faith Fast</div>
                            <div style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #cbd5e1; letter-spacing: 1.5px; margin-top: 4px; text-transform: uppercase;">Deepen your spiritual journey</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px 32px 8px;">
                            <h1 style="margin: 0 0 16px; font-family: Arial, Helvetica, sans-serif; font-size: 20px; color: #16181d;">' . $heading . '</h1>
                            <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #444444;">
                                ' . $bodyHtml . '
                            </div>
                            ' . $cta . '
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 24px 32px 32px;">
                            <hr style="border: none; border-top: 1px solid #e9ecef; margin: 0 0 16px;">
                            <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #8a8a8a; text-align: center;">
                                &copy; ' . $year . ' Faith Fast. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>';
    }

    // Configures a PHPMailer instance with this app's SMTP settings.
    private static function newMailer() {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port       = SMTP_PORT;
        $mail->CharSet    = 'UTF-8';
        $mail->setFrom(MAIL_FROM, 'Faith Fast');
        $mail->addReplyTo(MAIL_ADMIN_ADDR, MAIL_ADMIN_NAME);
        return $mail;
    }

    // Sends an HTML email, falling back to a plain-text version. Returns true/false instead of throwing.
    private static function send($toEmail, $toName, $subject, $htmlBody) {
        try {
            $mail = self::newMailer();
            $mail->addAddress($toEmail, $toName);
            $mail->Subject = $subject;
            $mail->isHTML(true);
            $mail->Body    = $htmlBody;
            $mail->AltBody = trim(strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>'], "\n", $htmlBody)));
            $mail->send();
            return true;
        } catch (PHPMailerException $e) {
            error_log('Mailer error: ' . $e->getMessage());
            return false;
        }
    }

    public static function sendWelcomeEmail($toEmail, $toName) {
        $body = '
            <p>Hi ' . htmlspecialchars($toName) . ',</p>
            <p>Welcome to <strong>Faith Fast</strong>! We are so glad you have joined our community of believers
            committed to drawing closer to God through fasting and prayer.</p>
            <p>Here is what you can do next:</p>
            <ul style="padding-left: 20px; margin: 0 0 16px;">
                <li>Start or join a fasting plan</li>
                <li>Record prayer requests and journal your journey</li>
                <li>Connect with your group for encouragement and support</li>
            </ul>
            <p style="font-style: italic; color: #283655; border-left: 3px solid #4a6fa5; padding-left: 12px; margin: 20px 0;">
                "Is not this the kind of fasting I have chosen: to loose the chains of injustice and untie the cords of
                the yoke, to set the oppressed free and break every yoke?" &mdash; Isaiah 58:6
            </p>
            <p>We are praying for you as you begin this journey.</p>';

        $html = self::renderTemplate('Welcome to Faith Fast, ' . htmlspecialchars($toName) . '!', $body, 'Open Faith Fast', appUrl() . '/index.html');
        return self::send($toEmail, $toName, 'Welcome to Faith Fast', $html);
    }

    public static function sendPasswordResetEmail($toEmail, $toName, $resetLink) {
        $body = '
            <p>Hi ' . htmlspecialchars($toName) . ',</p>
            <p>We received a request to reset the password for your Faith Fast account. Click the button below to
            choose a new password.</p>
            <p>This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can
            safely ignore this email and your password will remain unchanged.</p>';

        $html = self::renderTemplate('Reset your password', $body, 'Reset Password', $resetLink);
        return self::send($toEmail, $toName, 'Reset your Faith Fast password', $html);
    }
}
?>
