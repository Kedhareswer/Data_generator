"use client"

import { motion } from "framer-motion"
import { Github } from "lucide-react"

export function SocialLinks() {
  return (
    <motion.div
      className="flex justify-center space-x-4 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <motion.a
        href="https://github.com/Kedhareswer/Data_generator"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-gray-900 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Github className="w-6 h-6" />
      </motion.a>
    </motion.div>
  )
}
