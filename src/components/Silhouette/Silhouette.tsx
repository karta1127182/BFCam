import React, {useEffect} from 'react';
import {StyleSheet} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import type {SharedValue} from 'react-native-reanimated';
import Svg, {Path} from 'react-native-svg';
import type {SilhouetteDefinition} from '../../types/composition';
import {clampOverlayTranslation, overlayScaleForZoom} from '../../utils/zoom';

type Props = {
  definition: SilhouetteDefinition;
  containerWidth: number;
  containerHeight: number;
  opacity: number;
  locked: boolean;
  resetKey: number;
  cameraZoom: SharedValue<number>;
  followZoom: boolean;
};

const silhouetteStroke = {
  fill: 'rgba(255,241,211,0.09)',
  stroke: '#fff0cf',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const silhouettePaths: Record<SilhouetteDefinition['variant'], string> = {
  'street-coat': 'M47 2 C39 3 35 9 35 18 L32 21 L33 28 L37 31 L37 39 L31 39 L26 47 L19 51 C13 56 10 68 8 82 L3 122 C2 137 5 149 10 157 L16 165 L20 163 L23 168 L28 165 L29 176 L28 199 L25 221 L29 227 L25 233 L23 241 L31 245 L39 241 L41 233 L45 217 L49 181 L51 181 L55 217 L59 233 L61 242 L70 246 L78 243 L77 237 L72 228 L76 222 L73 198 L72 176 L73 165 L78 168 L82 165 L86 162 L92 149 L97 139 L97 91 C96 78 91 66 85 56 L77 48 L68 44 L63 36 L62 30 C65 26 65 18 63 11 C60 5 55 2 47 2 Z',
  'male-suit': 'M50 3 C41 3 36 10 36 20 C36 29 41 35 46 38 L45 44 L34 48 L25 56 L20 91 L15 126 C14 134 23 137 27 129 L35 91 L37 134 L34 177 L29 224 L25 231 L30 236 L42 233 L46 220 L50 158 L55 220 L59 233 L71 236 L76 231 L71 224 L67 177 L64 134 L66 91 L74 129 C78 137 87 134 86 126 L81 91 L76 56 L65 48 L55 44 L54 38 C60 34 65 29 65 20 C65 10 59 3 50 3 Z M46 45 L50 58 L54 45 L59 61 L51 75 L42 61 Z',
  'male-pocket': 'M47 3 C38 3 33 10 33 20 C33 29 38 35 44 38 L43 45 C33 48 27 55 24 67 L17 111 C15 119 24 123 28 115 L36 79 L39 96 L32 119 L39 126 L44 116 L43 144 L39 182 L32 225 L27 231 L32 236 L43 233 L48 217 L52 158 L58 218 L63 233 L75 235 L79 230 L73 223 L69 181 L66 141 L67 91 L75 117 C78 125 87 122 86 114 L78 69 C76 56 68 49 56 45 L55 38 C62 34 66 28 66 19 C66 9 58 3 47 3 Z M38 96 L48 108 L43 120 L33 113 Z',
  'male-lean': 'M57 4 C48 4 43 11 43 21 C43 30 48 36 54 39 L53 46 C42 49 35 57 31 69 L21 107 L10 133 C7 141 16 146 21 139 L37 114 L43 84 L45 138 L39 177 L31 221 L25 228 L29 234 L41 232 L47 219 L55 164 L63 179 L78 211 L75 220 L83 226 L93 222 L88 214 L78 171 L69 137 L70 90 L79 122 C82 130 92 127 90 118 L82 71 C80 58 72 50 63 46 L62 39 C68 35 72 29 72 20 C72 10 66 4 57 4 Z',
  'female-dress': 'M50 3 C41 3 35 10 35 20 C35 29 40 35 46 38 L45 45 C34 48 28 56 25 70 L17 117 C15 125 25 129 29 120 L37 82 L39 103 L29 165 L39 169 L35 198 L29 226 L25 232 L31 236 L42 233 L48 199 L50 170 L53 199 L59 233 L70 236 L76 232 L71 225 L65 198 L61 169 L72 165 L62 103 L64 82 L72 120 C76 129 86 125 84 117 L76 70 C73 56 66 48 55 45 L54 38 C60 34 65 29 65 20 C65 10 59 3 50 3 Z',
  'female-cross-leg': 'M48 3 C39 3 34 10 34 20 C34 29 39 35 45 38 L44 45 C34 48 28 56 26 69 L19 116 C18 124 27 128 31 120 L38 83 L40 137 L43 166 L36 199 L27 226 L23 232 L29 236 L40 232 L49 204 L54 178 L60 205 L69 229 L66 235 L78 236 L83 231 L77 224 L69 193 L63 165 L65 137 L63 83 L71 120 C75 128 84 124 83 116 L76 69 C74 56 66 48 55 45 L54 38 C61 34 65 29 65 20 C65 10 58 3 48 3 Z',
  'female-street-side': 'M53 3 C44 4 39 11 39 21 C39 30 44 36 50 39 L49 46 C39 49 33 58 31 72 L28 117 L21 145 C19 153 28 156 32 149 L42 119 L44 91 L46 139 L42 180 L37 224 L32 231 L37 236 L48 233 L53 217 L56 161 L62 183 L70 224 L68 232 L79 235 L84 230 L78 221 L72 176 L68 137 L68 95 L77 122 C80 130 90 127 88 118 L80 72 C78 59 70 50 60 46 L59 39 C65 35 69 29 69 20 C69 10 62 3 53 3 Z M40 78 C31 91 25 106 23 122 L31 123 L45 96 Z',
  walking: 'M49 6 C40 6 35 13 35 23 C35 32 40 38 46 41 L44 49 C34 52 28 60 26 73 L18 112 L10 139 C8 146 16 150 21 143 L34 112 L38 91 L40 137 L29 174 L14 218 C11 227 24 231 29 223 L48 181 L55 151 L63 178 L79 221 C82 229 95 226 92 217 L78 168 L68 132 L67 91 L76 119 L88 139 C92 146 101 141 97 134 L84 106 L77 70 C75 59 68 52 57 49 L56 41 C63 37 67 31 67 22 C67 12 59 6 49 6 Z',
  'arms-crossed': 'M50 6 C41 6 35 13 35 23 C35 32 40 38 46 41 L45 49 C34 52 27 59 25 72 L20 116 L28 118 L34 82 L39 96 L29 105 C23 111 27 120 35 116 L50 105 L65 116 C73 120 77 111 71 105 L61 96 L66 82 L72 118 L80 116 L75 72 C73 59 66 52 55 49 L54 41 C60 37 65 32 65 23 C65 13 59 6 50 6 Z M37 113 L37 148 L34 184 L29 224 C28 232 41 234 44 226 L50 166 L56 226 C59 234 72 232 71 224 L66 184 L63 148 L63 113 Z',
  waving: 'M47 7 C38 7 32 14 32 24 C32 33 37 39 43 42 L42 50 C32 53 26 61 24 74 L18 119 C17 127 27 130 30 122 L36 87 L39 137 L36 181 L32 225 C31 233 44 234 46 227 L50 157 L55 227 C58 234 71 232 70 224 L66 180 L64 136 L66 87 L75 111 C78 118 87 115 86 108 L79 73 L84 50 L92 34 C96 26 87 21 82 28 L72 43 L68 59 C65 55 60 52 54 50 L53 42 C60 38 64 32 64 23 C64 13 57 7 47 7 Z',
  kneeling: 'M43 7 C34 7 28 14 28 24 C28 33 33 39 39 42 L38 50 C28 53 22 61 20 75 L15 115 C14 123 24 126 27 118 L33 87 L38 124 L31 151 L16 185 C13 193 24 198 29 190 L49 160 L61 164 L77 190 L92 190 C99 190 100 181 93 179 L83 175 L69 145 C65 136 58 132 51 130 L57 88 L66 117 C69 125 79 122 78 114 L71 74 C69 61 62 53 51 50 L50 42 C57 38 61 32 61 23 C61 13 54 7 43 7 Z',
  selfie: 'M44 7 C35 7 29 14 29 24 C29 33 34 39 40 42 L39 50 C29 53 23 61 22 74 L18 116 C17 124 27 127 30 119 L35 88 L39 137 L36 181 L33 225 C32 233 45 234 47 227 L51 157 L57 227 C60 234 73 232 72 224 L68 180 L66 136 L67 86 L76 68 L84 45 L92 47 L94 35 L82 32 L80 41 L68 55 C64 53 58 51 51 50 L50 42 C57 38 61 32 61 23 C61 13 54 7 44 7 Z',
  'hand-on-hip': [
    'M50 6 C42 6 37 12 37 21 C37 29 41 35 46 38',
    'L45 45 C37 47 29 49 25 56 C21 64 20 76 19 86',
    'L12 108 C9 115 8 122 12 126 C15 129 19 126 21 121',
    'L29 96 C30 111 28 127 31 143 C33 153 35 159 36 166',
    'L34 194 L29 222 L25 228 C23 232 28 234 36 233 C41 233 43 231 44 226',
    'L49 190 L50 162 L54 190 L59 225 C60 231 63 233 69 233',
    'C77 233 80 230 75 226 L70 220 L68 190 L67 162 C68 153 71 145 70 133',
    'L66 94 C69 99 73 105 77 111 L70 126 C67 132 70 137 76 137',
    'C81 137 84 132 86 126 L90 113 C92 108 90 104 86 102',
    'L75 61 C72 52 65 48 56 45 L55 38 C61 34 64 28 64 20',
    'C64 11 58 6 50 6 Z',
  ].join(' '),
  'looking-back': [
    'M53 6 C44 5 37 11 36 20 L29 25 C27 27 29 30 34 31',
    'C35 36 39 40 45 42 L44 49 C35 51 28 55 25 63',
    'C21 72 21 86 20 99 L15 126 C14 133 17 138 22 139',
    'C27 140 30 136 31 130 L36 99 C38 113 35 130 33 143',
    'C32 153 35 160 36 168 L33 197 L28 222 L24 228',
    'C22 232 27 234 35 233 C40 233 43 230 44 225 L49 190 L51 164',
    'L55 190 L60 225 C61 231 65 233 71 232 C78 231 79 228 74 224',
    'L70 218 L68 190 L68 160 C70 150 71 141 69 131 L66 98',
    'L76 130 C78 137 82 140 87 137 C91 135 90 130 88 125',
    'L80 96 L76 65 C74 56 67 51 57 49 L56 42',
    'C63 38 66 32 66 25 C66 15 61 8 53 6 Z',
  ].join(' '),
  sitting: [
    'M37 6 C28 6 22 12 22 22 C22 31 27 37 32 40 L31 47',
    'C22 49 15 54 13 63 C11 72 13 88 12 103 L10 115',
    'C9 124 13 130 21 132 L48 139 L48 166 L43 171',
    'C38 175 41 179 48 179 C55 179 59 176 61 171 L64 144',
    'L68 165 L65 170 C63 174 68 177 75 175 C81 174 82 170 77 166',
    'L75 132 C75 124 72 118 65 115 L47 106 L47 78',
    'L61 101 C65 107 70 108 74 104 C77 101 74 96 71 92',
    'L55 62 C51 53 46 49 41 47 L41 40 C48 36 52 30 52 21',
    'C52 12 46 6 37 6 Z',
    'M25 77 C23 88 22 101 22 112 C22 117 25 120 30 121 L52 128',
    'L55 137 L23 130 C15 128 12 123 12 115 L14 99 Z',
  ].join(' '),
  'full-body': [
    'M50 6 C42 6 37 12 37 21 C37 29 41 35 46 38',
    'L45 45 C39 47 31 48 27 53 C22 60 21 71 20 82',
    'L15 111 L13 127 C13 133 19 134 21 128 L24 114',
    'L31 82 C33 95 32 108 30 120 C28 132 31 143 34 153',
    'L36 185 L32 219 L27 227 Q24 232 30 233 L39 233 Q44 232 44 227',
    'L49 185 L51 156 L55 186 L60 222 L58 228 Q58 232 63 232',
    'L72 233 Q80 232 75 227 L69 220 L67 183 L67 148',
    'C70 136 71 126 68 115 C65 103 66 94 68 81',
    'L76 112 L79 126 Q81 133 86 130 Q89 128 87 122',
    'L84 106 L78 73 C76 59 72 52 64 48 L55 45 L54 38',
    'C61 33 64 28 64 20 C64 11 58 6 50 6 Z',
  ].join(' '),
  'half-body': [
    'M50 6 C40 6 33 14 33 26 C33 37 39 44 46 47',
    'L45 55 C31 57 21 67 17 88 L7 157',
    'C4 167 14 170 18 163 L32 111 L30 154',
    'L30 168 L70 168 L70 154 L68 111 L82 163',
    'C86 170 96 167 95 159 L84 88',
    'C80 67 69 57 56 55 L55 47',
    'C62 43 67 36 67 26 C67 14 60 6 50 6 Z',
  ].join(' '),
  bust: 'M50 7 C39 7 32 16 32 29 C32 40 38 48 46 52 L45 60 C28 63 16 73 10 91 L5 119 L95 119 L90 91 C84 73 72 63 55 60 L54 52 C62 48 68 40 68 29 C68 16 61 7 50 7 Z',
  headshot: 'M50 7 C33 7 23 20 23 39 C23 55 31 68 43 74 L41 83 C26 86 15 97 10 119 L90 119 C85 97 74 86 59 83 L57 74 C69 68 77 55 77 39 C77 20 67 7 50 7 Z M29 39 C29 20 38 12 50 12 C62 12 71 20 71 39',
  'couple-side-by-side': [
    'M28 8 C20 8 15 15 15 24 C15 32 19 38 25 41 L24 48 C16 51 11 58 10 70 L7 116 L13 116 L17 78 L19 129 L17 177 L14 223 L26 223 L31 154 L36 223 L48 223 L45 177 L43 129 L45 78 L51 116 L57 113 L50 68 C49 57 43 51 34 48 L34 41 C40 37 43 31 43 23 C43 14 37 8 28 8 Z',
    'M70 8 C62 8 57 15 57 24 C57 32 61 38 67 41 L66 48 C57 51 52 58 51 70 L48 113 L54 116 L60 78 L62 129 L60 177 L57 223 L69 223 L74 154 L79 223 L91 223 L88 177 L86 129 L88 78 L92 116 L98 116 L95 70 C94 58 89 51 80 48 L80 41 C86 37 89 31 89 23 C89 14 83 8 70 8 Z',
  ].join(' '),
  'couple-staggered': [
    'M62 7 C53 7 48 14 48 24 C48 32 52 38 58 41 L57 49 C48 52 43 61 42 75 L39 126 L45 126 L50 83 L52 137 L49 181 L47 227 L59 227 L64 157 L69 227 L81 227 L78 181 L76 137 L78 83 L84 126 L90 126 L87 75 C86 61 80 52 71 49 L71 41 C77 37 80 31 80 23 C80 13 73 7 62 7 Z',
    'M31 37 C23 37 18 44 18 53 C18 61 22 67 28 70 L27 77 C18 80 13 88 12 100 L9 140 L15 140 L21 108 L22 151 L20 187 L18 226 L30 226 L34 169 L39 226 L50 226 L48 185 L46 149 L48 108 L53 140 L59 137 L55 99 C54 88 48 80 37 77 L37 70 C43 66 46 60 46 52 C46 43 40 37 31 37 Z',
  ].join(' '),
  'couple-facing': 'M25 8 C17 8 12 15 12 24 C12 32 16 38 22 41 L21 49 C13 52 9 61 9 75 L8 125 L15 125 L20 82 L23 135 L20 181 L18 225 L31 225 L36 155 L41 225 L53 225 L49 178 L47 134 L48 93 L58 111 L63 107 L50 73 C46 59 40 51 31 49 L31 41 C37 37 40 31 40 23 C40 14 34 8 25 8 Z M75 8 C83 8 88 15 88 24 C88 32 84 38 78 41 L79 49 C87 52 91 61 91 75 L92 125 L85 125 L80 82 L77 135 L80 181 L82 225 L69 225 L64 155 L59 225 L47 225 L51 178 L53 134 L52 93 L42 111 L37 107 L50 73 C54 59 60 51 69 49 L69 41 C63 37 60 31 60 23 C60 14 66 8 75 8 Z',
  'couple-sit-stand': 'M67 7 C58 7 53 14 53 24 C53 32 57 38 63 41 L62 49 C53 52 48 61 47 75 L45 123 L51 123 L56 83 L58 136 L55 181 L53 227 L65 227 L70 157 L75 227 L87 227 L84 181 L82 136 L84 83 L89 123 L95 123 L92 75 C91 61 85 52 76 49 L76 41 C82 37 85 31 85 23 C85 13 78 7 67 7 Z M27 57 C18 57 13 64 13 74 C13 82 17 88 23 91 L22 99 C14 102 10 111 10 124 L9 158 C9 169 15 174 26 176 L45 181 L45 205 L39 214 L51 214 L57 174 C57 164 52 158 44 155 L34 149 L35 121 L44 145 L51 141 L40 111 C37 104 33 100 28 99 L28 91 C34 87 37 81 37 73 C37 64 31 57 27 57 Z',
  'couple-holding-hands': 'M22 8 C14 8 9 15 9 24 C9 32 13 38 19 41 L18 49 C10 52 6 61 6 75 L5 124 L12 124 L17 82 L20 135 L17 181 L15 225 L28 225 L33 155 L38 225 L50 225 L46 178 L44 134 L46 91 L56 109 L50 115 L56 121 L63 113 L53 73 C49 59 43 51 28 49 L28 41 C34 37 37 31 37 23 C37 14 31 8 22 8 Z M78 8 C86 8 91 15 91 24 C91 32 87 38 81 41 L82 49 C90 52 94 61 94 75 L95 124 L88 124 L83 82 L80 135 L83 181 L85 225 L72 225 L67 155 L62 225 L50 225 L54 178 L56 134 L54 91 L44 109 L50 115 L44 121 L37 113 L47 73 C51 59 57 51 72 49 L72 41 C66 37 63 31 63 23 C63 14 69 8 78 8 Z',
  side: [
    'M53 6 C44 7 38 15 38 25 C38 33 42 39 48 43',
    'L47 51 C37 54 31 64 30 81 L33 123',
    'L29 162 L23 226 C22 234 34 236 37 228 L50 169',
    'L60 228 C63 236 76 233 74 224 L67 157 L65 119',
    'L76 139 C80 145 89 140 86 133 L68 91',
    'C66 75 63 62 57 56 L57 48 C63 44 66 39 67 34',
    'L75 31 L67 25 C66 13 61 5 53 6 Z',
    'M34 82 C24 94 17 112 14 132 C13 140 22 142 25 135 L42 101 Z',
  ].join(' '),
  'food-plate': 'M50 9 C73 9 91 27 91 50 C91 73 73 91 50 91 C27 91 9 73 9 50 C9 27 27 9 50 9 Z M50 20 C67 20 80 33 80 50 C80 67 67 80 50 80 C33 80 20 67 20 50 C20 33 33 20 50 20 Z M36 43 C42 34 55 31 64 39 C72 46 69 61 58 66 C47 71 33 64 32 53 C31 49 33 46 36 43 Z',
  'coffee-dessert': 'M12 30 L50 30 L47 69 C46 78 39 84 31 84 C22 84 16 78 15 69 Z M50 39 C65 36 70 43 68 53 C66 63 58 67 48 64 M72 47 C77 36 88 34 94 43 L88 81 L62 81 L67 56 Z M70 58 C77 61 85 61 91 57 M9 88 C33 92 70 92 95 87',
  'table-setting': 'M7 14 L93 14 L93 86 L7 86 Z M50 25 C64 25 75 36 75 50 C75 64 64 75 50 75 C36 75 25 64 25 50 C25 36 36 25 50 25 Z M15 27 L15 72 M19 27 L19 72 M84 27 L84 72 M88 27 L88 72',
  'mountain-view': 'M3 86 L24 55 L34 66 L53 25 L67 47 L75 39 L97 86 Z M43 43 L53 25 L63 43 L56 39 L51 45 L47 39 Z M3 86 C23 78 36 83 51 78 C66 73 79 79 97 72',
  'city-skyline': 'M3 88 L3 63 L15 63 L15 42 L28 42 L28 69 L36 69 L36 26 L51 26 L51 53 L60 53 L60 35 L72 35 L72 65 L80 65 L80 47 L94 47 L94 88 Z M41 34 L46 34 M41 43 L46 43 M65 43 L68 43 M20 50 L23 50 M84 55 L90 55',
  architecture: 'M12 92 L12 35 L50 8 L88 35 L88 92 Z M7 92 L93 92 M23 42 L23 81 M34 42 L34 81 M66 42 L66 81 M77 42 L77 81 M43 92 L43 58 L57 58 L57 92 M17 35 L83 35',
  dog: 'M8 69 C12 55 22 47 37 47 L59 48 C65 41 70 33 78 30 L86 19 L89 34 C95 40 96 50 91 58 C87 64 81 66 74 65 L70 83 L62 83 L60 61 L37 63 L32 83 L24 83 L23 61 C18 64 15 70 14 76 M12 55 C5 50 4 43 8 38',
  cat: 'M28 31 L22 12 L38 23 C45 19 55 19 62 23 L78 12 L72 32 C77 39 79 48 76 58 C73 67 68 72 65 78 L72 91 L62 91 L56 76 L54 92 L45 92 L43 76 L36 91 L26 91 L34 76 C25 70 20 61 21 50 C21 42 23 36 28 31 Z M70 62 C88 60 94 70 89 84 C87 90 80 91 76 87',
  product: 'M27 25 L73 25 L81 88 L19 88 Z M35 25 C35 12 43 7 50 7 C58 7 65 12 65 25 M28 39 L72 39 M39 54 L61 54 L61 72 L39 72 Z',
  bottle: 'M40 7 L60 7 L60 20 L65 26 L68 88 L32 88 L35 26 L40 20 Z M39 39 L61 39 L62 70 L38 70 Z M40 14 L60 14',
};

const silhouetteViewBoxes: Partial<Record<SilhouetteDefinition['variant'], string>> = {
  'street-coat': '0 0 100 248',
  'half-body': '0 0 100 175',
  bust: '0 0 100 125',
  headshot: '0 0 100 125',
  sitting: '0 0 100 185',
  'food-plate': '0 0 100 100',
  'coffee-dessert': '0 0 100 100',
  'table-setting': '0 0 100 100',
  'mountain-view': '0 0 100 100',
  'city-skyline': '0 0 100 100',
  architecture: '0 0 100 100',
  dog: '0 0 100 100',
  cat: '0 0 100 100',
  product: '0 0 100 100',
  bottle: '0 0 100 100',
};

const humanVariants = new Set<SilhouetteDefinition['variant']>([
  'full-body', 'half-body', 'bust', 'headshot', 'side', 'hand-on-hip', 'looking-back', 'sitting',
  'walking', 'arms-crossed', 'waving', 'kneeling', 'selfie', 'street-coat',
  'male-suit', 'male-pocket', 'male-lean', 'female-dress', 'female-cross-leg', 'female-street-side',
  'couple-side-by-side', 'couple-staggered', 'couple-facing', 'couple-sit-stand', 'couple-holding-hands',
]);

export function PoseDrawing({variant}: {variant: SilhouetteDefinition['variant']}) {
  return <Svg viewBox={silhouetteViewBoxes[variant] ?? '0 0 100 240'} width="100%" height="100%">
    <Path d={silhouettePaths[variant]} fill="none" stroke="rgba(15,21,26,0.55)" strokeWidth={3.5} strokeLinejoin="round" />
    <Path d={silhouettePaths[variant]} {...silhouetteStroke} fill={humanVariants.has(variant) ? 'rgba(11,15,18,0.58)' : silhouetteStroke.fill} fillRule="evenodd" />
  </Svg>;
}

export function Silhouette({definition, containerWidth, containerHeight, opacity, locked, resetKey, cameraZoom, followZoom}: Props) {
  const width = containerWidth * definition.width;
  const height = containerHeight * definition.height;
  const centerX = containerWidth * definition.x;
  const centerY = containerHeight * definition.y;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);

  useEffect(() => {
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    scale.value = withTiming(1);
  }, [definition.id, definition.x, definition.y, resetKey, scale, translateX, translateY]);

  const pan = Gesture.Pan()
    .enabled(!locked)
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate(event => {
      const effectiveScale = scale.value * (followZoom ? overlayScaleForZoom(cameraZoom.value) : 1);
      translateX.value = clampOverlayTranslation(startX.value + event.translationX, centerX, containerWidth, width, effectiveScale);
      translateY.value = clampOverlayTranslation(startY.value + event.translationY, centerY, containerHeight, height, effectiveScale);
    });
  const pinch = Gesture.Pinch()
    .enabled(!locked)
    .onBegin(() => {
      startScale.value = scale.value;
    })
    .onUpdate(event => {
      scale.value = Math.min(Math.max(startScale.value * event.scale, 0.5), 2);
      const effectiveScale = scale.value * (followZoom ? overlayScaleForZoom(cameraZoom.value) : 1);
      translateX.value = clampOverlayTranslation(translateX.value, centerX, containerWidth, width, effectiveScale);
      translateY.value = clampOverlayTranslation(translateY.value, centerY, containerHeight, height, effectiveScale);
    });
  const gesture = Gesture.Simultaneous(pan, pinch);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: translateX.value},
      {translateY: translateY.value},
      {scale: scale.value * (followZoom ? overlayScaleForZoom(cameraZoom.value) : 1)},
      {rotate: `${definition.rotation ?? 0}deg`},
    ],
  }));
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        pointerEvents={locked ? 'none' : 'auto'}
        accessibilityLabel="拍攝構圖輪廓"
        style={[
          styles.container,
          {
            left: containerWidth * definition.x - width / 2,
            top: containerHeight * definition.y - height / 2,
            width,
            height,
            opacity,
          },
          animatedStyle,
        ]}>
        <PoseDrawing variant={definition.variant} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {position: 'absolute'},
});
