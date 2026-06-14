-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Sep 28, 2025 at 02:39 PM
-- Server version: 8.0.31
-- PHP Version: 8.0.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hillsong_fast`
--

-- --------------------------------------------------------

--
-- Table structure for table `bible_books`
--

DROP TABLE IF EXISTS `bible_books`;
CREATE TABLE IF NOT EXISTS `bible_books` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `chapters` int NOT NULL,
  `testament` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `bible_books`
--

INSERT INTO `bible_books` (`id`, `name`, `chapters`, `testament`) VALUES
(1, 'Genesis', 50, 'Old Testament'),
(2, 'Exodus', 40, 'Old Testament'),
(3, 'Leviticus', 27, 'Old Testament'),
(4, 'Numbers', 36, 'Old Testament'),
(5, 'Deuteronomy', 34, 'Old Testament'),
(6, 'Joshua', 24, 'Old Testament'),
(7, 'Judges', 21, 'Old Testament'),
(8, 'Ruth', 4, 'Old Testament'),
(9, '1 Samuel', 31, 'Old Testament'),
(10, '2 Samuel', 24, 'Old Testament'),
(11, '1 Kings', 22, 'Old Testament'),
(12, '2 Kings', 25, 'Old Testament'),
(13, '1 Chronicles', 29, 'Old Testament'),
(14, '2 Chronicles', 36, 'Old Testament'),
(15, 'Ezra', 10, 'Old Testament'),
(16, 'Nehemiah', 13, 'Old Testament'),
(17, 'Esther', 10, 'Old Testament'),
(18, 'Job', 42, 'Old Testament'),
(19, 'Psalms', 150, 'Old Testament'),
(20, 'Proverbs', 31, 'Old Testament'),
(21, 'Ecclesiastes', 12, 'Old Testament'),
(22, 'Song of Solomon', 8, 'Old Testament'),
(23, 'Isaiah', 66, 'Old Testament'),
(24, 'Jeremiah', 52, 'Old Testament'),
(25, 'Lamentations', 5, 'Old Testament'),
(26, 'Ezekiel', 48, 'Old Testament'),
(27, 'Daniel', 12, 'Old Testament'),
(28, 'Hosea', 14, 'Old Testament'),
(29, 'Joel', 3, 'Old Testament'),
(30, 'Amos', 9, 'Old Testament'),
(31, 'Obadiah', 1, 'Old Testament'),
(32, 'Jonah', 4, 'Old Testament'),
(33, 'Micah', 7, 'Old Testament'),
(34, 'Nahum', 3, 'Old Testament'),
(35, 'Habakkuk', 3, 'Old Testament'),
(36, 'Zephaniah', 3, 'Old Testament'),
(37, 'Haggai', 2, 'Old Testament'),
(38, 'Zechariah', 14, 'Old Testament'),
(39, 'Malachi', 4, 'Old Testament'),
(40, 'Matthew', 28, 'New Testament'),
(41, 'Mark', 16, 'New Testament'),
(42, 'Luke', 24, 'New Testament'),
(43, 'John', 21, 'New Testament'),
(44, 'Acts', 28, 'New Testament'),
(45, 'Romans', 16, 'New Testament'),
(46, '1 Corinthians', 16, 'New Testament'),
(47, '2 Corinthians', 13, 'New Testament'),
(48, 'Galatians', 6, 'New Testament'),
(49, 'Ephesians', 6, 'New Testament'),
(50, 'Philippians', 4, 'New Testament'),
(51, 'Colossians', 4, 'New Testament'),
(52, '1 Thessalonians', 5, 'New Testament'),
(53, '2 Thessalonians', 3, 'New Testament'),
(54, '1 Timothy', 6, 'New Testament'),
(55, '2 Timothy', 4, 'New Testament'),
(56, 'Titus', 3, 'New Testament'),
(57, 'Philemon', 1, 'New Testament'),
(58, 'Hebrews', 13, 'New Testament'),
(59, 'James', 5, 'New Testament'),
(60, '1 Peter', 5, 'New Testament'),
(61, '2 Peter', 3, 'New Testament'),
(62, '1 John', 5, 'New Testament'),
(63, '2 John', 1, 'New Testament'),
(64, '3 John', 1, 'New Testament'),
(65, 'Jude', 1, 'New Testament'),
(66, 'Revelation', 22, 'New Testament');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
