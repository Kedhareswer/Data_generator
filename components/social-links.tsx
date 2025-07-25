"use client"

import { motion } from "framer-motion"
import { Github, Instagram, Twitter } from "lucide-react"
import Link from "next/link"

const socialLinks = [
  {
    name: "Twitter",
    url: "https://x.com/vixclotet",
    icon: Twitter,
    color: "hover:text-blue-400",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/vixclotet/",
    icon: Instagram,
    color: "hover:text-pink-500",
  },
  {
    name: "GitHub",
    url: "https://github.com/vixclotet",
    icon: Github,
    color: "hover:text-gray-800",
  },
]

export function SocialLinks() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 items-center justify-center my-4"
    >
      {socialLinks.map((link, index) => (
        <motion.div
          key={link.name}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          <Link
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block p-2 rounded-full transition-colors ${link.color}`}
          >
            <link.icon className="w-6 h-6" />
            <span className="sr-only">{link.name}</span>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}
