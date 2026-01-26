import MainLayout from "../Profile/MainLayout";
import "../Profile/Base.css";

function About() {
  return (
    <MainLayout>
      <div className="about-container" style={{ 
        background: "#1a1a1b", 
        color: "#fff", 
        minHeight: "80vh",
        padding: "2rem",
        borderRadius: "24px",
        maxWidth: "700px",
        margin: "2rem auto"
      }}>
        <h1 style={{ color: "#fff", fontSize: "2.5rem", marginBottom: "1.2rem" }}>
          About This Project
        </h1>
        <p style={{ color: "#d7dadc", fontSize: "1.1rem" }}>
          This project is a <strong>Master's Thesis</strong> from the University of Minho,
          developed by <b>João Rodrigues</b> under the supervision of Prof. Pedro Henriques, and co-supervision of Alice Balbé and Alvaro Costa.
        </p>
        <p style={{ marginTop: "1.3rem", color: "#d7dadc", fontSize: "1.1rem" }}>
          The main goal of this work is to make it easier for new programmers to get started in the programming field.
          By providing a collaborative and interactive environment, we hope to help students,
          develop essential skills and build confidence as they begin to study programming.
        </p>
        <p style={{ marginTop: "2rem", color: "#d7dadc", fontSize: "1.1rem" }}>
          <b>Authors:</b><br />
          João Rodrigues<br />
          <b>Supervisors:</b><br />
          Pedro Henriques (Supervisor)<br />
          Alice Balbé (Co-supervisor)<br />
          Alvaro Costa Neto (Co-supervisor)
        </p>
        <p style={{ marginTop: "2.5rem", color: "#d7dadc", fontSize: "1rem", fontStyle: "italic" }}>
          University of Minho - Master's Thesis in Informatics Engineering<br />
        </p>
      </div>
    </MainLayout>
  );
}

export default About;
